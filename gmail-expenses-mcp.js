#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { google } from "googleapis";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { createServer } from "http";
import { URL } from "url";
import open from "open";
import { homedir } from "os";
import { join } from "path";

const CREDENTIALS_PATH = join(homedir(), ".gmail-mcp", "gcp-oauth.keys.json");
const TOKEN_PATH = join(homedir(), ".gmail-mcp", "gmail-token.json");

class GmailExpensesMCP {
  constructor() {
    this.auth = null;
    this.gmail = null;
  }

  async loadCredentials() {
    if (!existsSync(CREDENTIALS_PATH)) {
      throw new Error(`Gmail credentials not found at ${CREDENTIALS_PATH}`);
    }

    const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf8"));
    const { client_id, client_secret } = credentials.installed || credentials.web;

    this.oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      "http://localhost:3001/oauth2callback"
    );

    if (existsSync(TOKEN_PATH)) {
      const tokens = JSON.parse(readFileSync(TOKEN_PATH, "utf8"));
      this.oauth2Client.setCredentials(tokens);
      this.gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
      return true;
    }
    return false;
  }

  saveTokens(tokens) {
    writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  }

  async authenticate() {
    await this.loadCredentials();

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/gmail.modify"],
    });

    return new Promise((resolve, reject) => {
      const server = createServer(async (req, res) => {
        const url = new URL(req.url, "http://localhost:3001");

        if (url.pathname === "/oauth2callback") {
          const code = url.searchParams.get("code");

          if (code) {
            try {
              const { tokens } = await this.oauth2Client.getToken(code);
              this.oauth2Client.setCredentials(tokens);
              this.saveTokens(tokens);
              this.gmail = google.gmail({ version: "v1", auth: this.oauth2Client });

              res.writeHead(200, { "Content-Type": "text/html" });
              res.end("<h1>Gmail authentication successful!</h1><p>You can close this window.</p>");
              server.close();
              resolve(true);
            } catch (error) {
              res.writeHead(500, { "Content-Type": "text/html" });
              res.end(`<h1>Error</h1><p>${error.message}</p>`);
              server.close();
              reject(error);
            }
          }
        }
      });

      server.listen(3001, async () => {
        console.error("Opening browser for Gmail authentication...");
        await open(authUrl);
      });

      setTimeout(() => {
        server.close();
        reject(new Error("Authentication timed out after 5 minutes"));
      }, 300000);
    });
  }

  async ensureAuthenticated() {
    const hasTokens = await this.loadCredentials().catch(() => false);
    if (!hasTokens || !this.gmail) {
      await this.authenticate();
    }
    return true;
  }

  async listStarredEmails(maxResults = 20) {
    await this.ensureAuthenticated();

    const response = await this.gmail.users.messages.list({
      userId: "me",
      q: "is:starred",
      maxResults,
    });

    if (!response.data.messages) {
      return [];
    }

    const emails = await Promise.all(
      response.data.messages.map(async (msg) => {
        const detail = await this.gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date"],
        });

        const headers = detail.data.payload.headers;
        return {
          id: msg.id,
          from: headers.find((h) => h.name === "From")?.value,
          subject: headers.find((h) => h.name === "Subject")?.value,
          date: headers.find((h) => h.name === "Date")?.value,
          hasAttachments: detail.data.payload.parts?.some(
            (p) => p.filename && p.filename.length > 0
          ),
        };
      })
    );

    return emails;
  }

  async getEmailContent(messageId) {
    await this.ensureAuthenticated();

    const response = await this.gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const headers = response.data.payload.headers;
    const parts = response.data.payload.parts || [response.data.payload];

    let body = "";
    const attachments = [];

    const extractBody = (parts) => {
      for (const part of parts) {
        if (part.mimeType === "text/plain" && part.body.data) {
          body = Buffer.from(part.body.data, "base64").toString("utf8");
        } else if (part.mimeType === "text/html" && part.body.data && !body) {
          body = Buffer.from(part.body.data, "base64").toString("utf8");
        } else if (part.filename && part.body.attachmentId) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType,
            attachmentId: part.body.attachmentId,
            size: part.body.size,
          });
        } else if (part.parts) {
          extractBody(part.parts);
        }
      }
    };

    extractBody(parts);

    return {
      id: messageId,
      from: headers.find((h) => h.name === "From")?.value,
      subject: headers.find((h) => h.name === "Subject")?.value,
      date: headers.find((h) => h.name === "Date")?.value,
      body: body.substring(0, 5000), // Limit body size
      attachments,
    };
  }

  async getAttachment(messageId, attachmentId, filename) {
    await this.ensureAuthenticated();

    const response = await this.gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: attachmentId,
    });

    const data = Buffer.from(response.data.data, "base64");

    // Save to temp file for Claude to read
    const tempPath = `/tmp/${filename}`;
    writeFileSync(tempPath, data);

    return {
      filename,
      path: tempPath,
      size: data.length,
    };
  }

  async unstarEmail(messageId) {
    await this.ensureAuthenticated();

    await this.gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: {
        removeLabelIds: ["STARRED"],
      },
    });

    return { success: true, messageId };
  }
}

// MCP Server setup
const gmailExpenses = new GmailExpensesMCP();

const server = new Server(
  { name: "gmail-expenses", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "gmail_list_starred",
      description: "List starred emails that may contain invoices/expenses",
      inputSchema: {
        type: "object",
        properties: {
          maxResults: { type: "number", description: "Max emails to return (default 20)" },
        },
      },
    },
    {
      name: "gmail_get_email",
      description: "Get full content of an email including body and attachment info",
      inputSchema: {
        type: "object",
        properties: {
          messageId: { type: "string", description: "The email message ID" },
        },
        required: ["messageId"],
      },
    },
    {
      name: "gmail_get_attachment",
      description: "Download an email attachment to a temp file for viewing",
      inputSchema: {
        type: "object",
        properties: {
          messageId: { type: "string", description: "The email message ID" },
          attachmentId: { type: "string", description: "The attachment ID" },
          filename: { type: "string", description: "The filename" },
        },
        required: ["messageId", "attachmentId", "filename"],
      },
    },
    {
      name: "gmail_unstar",
      description: "Remove star from an email after processing",
      inputSchema: {
        type: "object",
        properties: {
          messageId: { type: "string", description: "The email message ID" },
        },
        required: ["messageId"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "gmail_list_starred": {
        const emails = await gmailExpenses.listStarredEmails(args.maxResults || 20);
        return {
          content: [{ type: "text", text: JSON.stringify(emails, null, 2) }],
        };
      }

      case "gmail_get_email": {
        const email = await gmailExpenses.getEmailContent(args.messageId);
        return {
          content: [{ type: "text", text: JSON.stringify(email, null, 2) }],
        };
      }

      case "gmail_get_attachment": {
        const result = await gmailExpenses.getAttachment(
          args.messageId,
          args.attachmentId,
          args.filename
        );
        return {
          content: [
            {
              type: "text",
              text: `Attachment saved to ${result.path} (${result.size} bytes). Use the Read tool to view it.`,
            },
          ],
        };
      }

      case "gmail_unstar": {
        const result = await gmailExpenses.unstarEmail(args.messageId);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
