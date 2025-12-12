#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { XeroClient } from "xero-node";
import { config } from "dotenv";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { createServer } from "http";
import { URL } from "url";
import open from "open";
import { basename } from "path";

config();

const TOKEN_PATH = ".xero-token.json";

class XeroExpensesMCP {
  constructor() {
    const redirectUri = process.env.XERO_REDIRECT_URI || "http://localhost:3000/callback";
    this.xero = new XeroClient({
      clientId: process.env.XERO_CLIENT_ID,
      clientSecret: process.env.XERO_CLIENT_SECRET,
      redirectUris: [redirectUri],
      scopes: [
        "openid",
        "profile",
        "email",
        "accounting.transactions",
        "accounting.contacts.read",
        "accounting.settings.read",
      ],
    });
    this.tenantId = null;
  }

  async loadTokens() {
    if (existsSync(TOKEN_PATH)) {
      const tokens = JSON.parse(readFileSync(TOKEN_PATH, "utf8"));
      this.xero.setTokenSet(tokens);

      if (this.xero.tokenSet.expired()) {
        await this.xero.refreshToken();
        this.saveTokens();
      }

      const tenants = await this.xero.updateTenants();
      this.tenantId = tenants[0]?.tenantId;
      return true;
    }
    return false;
  }

  saveTokens() {
    writeFileSync(TOKEN_PATH, JSON.stringify(this.xero.tokenSet, null, 2));
  }

  async authenticate() {
    const consentUrl = await this.xero.buildConsentUrl();

    return new Promise((resolve, reject) => {
      const server = createServer(async (req, res) => {
        const url = new URL(req.url, "http://localhost:3000");

        if (url.pathname === "/callback") {
          const code = url.searchParams.get("code");

          if (code) {
            try {
              await this.xero.apiCallback(url.toString());
              this.saveTokens();

              const tenants = await this.xero.updateTenants();
              this.tenantId = tenants[0]?.tenantId;

              res.writeHead(200, { "Content-Type": "text/html" });
              res.end("<h1>Authentication successful!</h1><p>You can close this window.</p>");
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

      server.listen(3000, async () => {
        console.error(`Opening browser for Xero authentication...`);
        await open(consentUrl);
      });

      setTimeout(() => {
        server.close();
        reject(new Error("Authentication timed out after 5 minutes"));
      }, 300000);
    });
  }

  async ensureAuthenticated() {
    const hasTokens = await this.loadTokens().catch(() => false);
    if (!hasTokens || !this.tenantId) {
      await this.authenticate();
    }
    return true;
  }

  async listAccounts() {
    await this.ensureAuthenticated();
    const response = await this.xero.accountingApi.getAccounts(this.tenantId);
    return response.body.accounts
      .filter(a => a.status === "ACTIVE")
      .map(a => ({
        code: a.code,
        name: a.name,
        type: a.type,
        class: a.class,
      }));
  }

  async listContacts(searchTerm) {
    await this.ensureAuthenticated();
    const where = searchTerm ? `Name.Contains("${searchTerm}")` : undefined;
    const response = await this.xero.accountingApi.getContacts(
      this.tenantId,
      undefined,
      where,
      undefined,
      undefined,
      undefined,
      undefined,
      20
    );
    return response.body.contacts.map(c => ({
      contactId: c.contactID,
      name: c.name,
      email: c.emailAddress,
    }));
  }

  async createContact(name, email) {
    await this.ensureAuthenticated();
    const contact = { name, emailAddress: email };
    const response = await this.xero.accountingApi.createContacts(this.tenantId, { contacts: [contact] });
    const created = response.body.contacts[0];
    return { contactId: created.contactID, name: created.name };
  }

  async createBill({ vendorName, vendorEmail, amount, description, accountCode, date, dueDate, reference }) {
    await this.ensureAuthenticated();

    // Find or create contact
    let contacts = await this.listContacts(vendorName);
    let contact = contacts.find(c => c.name.toLowerCase() === vendorName.toLowerCase());

    if (!contact) {
      contact = await this.createContact(vendorName, vendorEmail || undefined);
    }

    // Create the bill (ACCPAY invoice)
    const bill = {
      type: "ACCPAY",
      contact: { contactID: contact.contactId },
      date: date || new Date().toISOString().split("T")[0],
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      reference: reference || undefined,
      lineItems: [
        {
          description: description || "Expense",
          quantity: 1,
          unitAmount: amount,
          accountCode: accountCode || "400", // Default expense account
        },
      ],
      status: "DRAFT",
    };

    const response = await this.xero.accountingApi.createInvoices(this.tenantId, { invoices: [bill] });
    const created = response.body.invoices[0];

    return {
      invoiceId: created.invoiceID,
      invoiceNumber: created.invoiceNumber,
      vendor: created.contact.name,
      total: created.total,
      status: created.status,
      date: created.date,
    };
  }

  async attachFileToBill(invoiceId, filePath) {
    await this.ensureAuthenticated();

    const fileName = basename(filePath);
    const fileContent = readFileSync(filePath);

    // Determine mime type from extension
    const ext = fileName.split('.').pop().toLowerCase();
    const mimeTypes = {
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
    };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    const response = await this.xero.accountingApi.createInvoiceAttachmentByFileName(
      this.tenantId,
      invoiceId,
      fileName,
      fileContent,
      true, // includeOnline
      mimeType
    );

    return {
      attachmentId: response.body.attachments[0]?.attachmentID,
      fileName: fileName,
      success: true,
    };
  }
}

// MCP Server setup
const xeroExpenses = new XeroExpensesMCP();

const server = new Server(
  { name: "xero-expenses", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "xero_list_accounts",
      description: "List available Xero accounts/categories for expenses",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "xero_list_contacts",
      description: "Search for vendors/contacts in Xero",
      inputSchema: {
        type: "object",
        properties: {
          search: { type: "string", description: "Search term for vendor name" },
        },
      },
    },
    {
      name: "xero_create_bill",
      description: "Create a bill/expense in Xero",
      inputSchema: {
        type: "object",
        properties: {
          vendorName: { type: "string", description: "Name of the vendor" },
          vendorEmail: { type: "string", description: "Email of the vendor (optional)" },
          amount: { type: "number", description: "Total amount of the expense" },
          description: { type: "string", description: "Description of the expense" },
          accountCode: { type: "string", description: "Xero account code (e.g., '400' for expenses)" },
          date: { type: "string", description: "Invoice date (YYYY-MM-DD)" },
          dueDate: { type: "string", description: "Due date (YYYY-MM-DD)" },
          reference: { type: "string", description: "Reference number from the invoice" },
        },
        required: ["vendorName", "amount", "description"],
      },
    },
    {
      name: "xero_attach_file",
      description: "Attach a file (PDF, image) to an existing Xero bill",
      inputSchema: {
        type: "object",
        properties: {
          invoiceId: { type: "string", description: "The Xero invoice/bill ID" },
          filePath: { type: "string", description: "Path to the file to attach" },
        },
        required: ["invoiceId", "filePath"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "xero_list_accounts": {
        const accounts = await xeroExpenses.listAccounts();
        const expenseAccounts = accounts.filter(a => a.class === "EXPENSE" || a.type === "EXPENSE");
        return {
          content: [{ type: "text", text: JSON.stringify(expenseAccounts, null, 2) }],
        };
      }

      case "xero_list_contacts": {
        const contacts = await xeroExpenses.listContacts(args.search);
        return {
          content: [{ type: "text", text: JSON.stringify(contacts, null, 2) }],
        };
      }

      case "xero_create_bill": {
        const result = await xeroExpenses.createBill(args);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "xero_attach_file": {
        const result = await xeroExpenses.attachFileToBill(args.invoiceId, args.filePath);
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
