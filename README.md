# Expense Agent

Process Gmail receipts and Amazon orders into Xero expenses using Codex/Claude.

## Requirements

- Codex or [Claude Code](https://claude.ai/claude-code) CLI
- Node.js 18+
- Xero account
- Gmail account connected through the Codex Gmail plugin/app (`@gmail`)
- Clockify account (optional, for invoice generation)

## Features

- **Gmail Expenses**: Star emails with receipts/invoices, run `/process-expenses` to create Xero receipts
- **Amazon Orders**: Run `/process-amazon-orders` to review recent Amazon purchases and expense business items
- **Invoice Generation**: Run `/generate-invoice-from-clockify` to create Xero invoices from Clockify time entries

## Setup

### 1. Gmail Plugin

Gmail access uses the configured Codex Gmail plugin/app (`@gmail`), not the legacy Gmail MCP server.

In Codex:

1. Confirm the Gmail plugin is installed and connected.
2. Use `$process-expenses` or `$process-expenses-bills` from this repo.
3. The workflows use Gmail plugin actions such as native search, message reads, attachment reads, and label changes.

### 2. Xero API Credentials

1. Go to [Xero Developer Portal](https://developer.xero.com/app/manage)
2. Click **New app**
3. Fill in:
   - **App name**: Expense Agent
   - **Integration type**: Mobile or desktop app (uses PKCE, no secret needed)
   - **Company or application URL**: http://localhost
   - **Redirect URI**: http://localhost:3000/callback
4. After creation, note your **Client ID**
5. Create a `.env` file in this project:
   ```
   XERO_CLIENT_ID=your_client_id
   XERO_REDIRECT_URI=http://localhost:3000/callback
   ```

### 3. Clockify API (Optional)

To generate invoices from Clockify time entries:

1. Go to [Clockify Settings](https://app.clockify.me/user/settings)
2. Scroll to **API** section
3. Click **Generate** to create an API key
4. Add to your `.mcp.json`:
   ```json
   {
     "mcpServers": {
       "clockify-time-entries": {
         "type": "stdio",
         "command": "npx",
         "args": ["-y", "mcp_clockify@latest"],
         "env": {
           "CLOCKIFY_API_KEY": "your-clockify-api-key"
         }
       }
     }
   }
   ```

**Note**: Use `mcp_clockify` (not `@https-eduardo/clockify-mcp-server` or `@aot-tech/clockify-mcp-server`) - it's the most reliable npm package.

### 4. Amazon Orders (Optional)

To process Amazon orders, add your Amazon credentials to `.env`:

```
AMAZON_USERNAME=your-amazon-email@example.com
AMAZON_PASSWORD=your-amazon-password
```

See [amazon-order-mcp](https://github.com/muness/amazon-order-mcp) for the MCP server.

### 5. 1Password MCP (Optional)

This repo can use the local 1Password MCP server to manage 1Password Environments without exposing raw secrets to the agent.

Requirements:

- 1Password desktop app installed
- 1Password Settings > Labs > MCP Server enabled
- 1Password Settings > Developer > Integrate with MCP clients configured

The local config uses:

```json
{
  "command": "/Applications/1Password.app/Contents/MacOS/1password-mcp"
}
```

After changing MCP configuration, restart Codex.

### 6. First Run

```bash
npm install
claude
```

The first time you use Xero tools, it will open a browser for OAuth authentication.

## Usage

### Process Gmail Expenses

Star emails in Gmail that contain invoices/receipts, then:

```
/process-expenses
```

### Process Amazon Orders

Review recent Amazon orders and create receipts for business expenses:

```
/process-amazon-orders
```

You'll be prompted for your Amazon 2FA code if enabled.

Amazon order processing state can be kept in SQLite:

```bash
npm run amazon-status:migrate
npm run amazon-status:summary
```

`amazon-order-status.json` still works as a fallback/source file, but `amazon-order-status.sqlite` is better once the history grows.

### Generate Invoice from Clockify

Create a Xero invoice based on Clockify time entries for a specific month:

```
/generate-invoice-from-clockify
```

You'll be prompted for:
- Month and year
- Client name
- Hourly rate

The command will fetch your billable hours from Clockify, show a breakdown by project, and create a draft invoice in Xero.

### Example Commands

- `"Show me my starred emails"` - List starred emails
- `"What Xero accounts can I use?"` - List expense account codes
- `"Create an expense for $50 from Acme Corp"` - Manual entry

## Project Structure

```
expenses/
├── .claude/commands/                  # Slash commands
│   ├── process-expenses.md
│   ├── process-amazon-orders.md
│   └── generate-invoice-from-clockify.md
├── .env                               # Your credentials (not in git)
├── .env.example                       # Template
├── .mcp.json                          # MCP server configuration
├── amazon-order-to-pdf.cjs            # PDF generator for Amazon orders
├── html-to-pdf.cjs                    # Generic HTML to PDF converter
├── xero-expenses-mcp.js               # Xero MCP server
└── README.md
```

## Troubleshooting

### Gmail plugin access fails
- Confirm the Gmail plugin/app is installed and connected in Codex.
- Restart Codex after changing plugin or MCP configuration.
- Use the configured `@gmail` plugin rather than `@gongrzhe/server-gmail-autoauth-mcp`.

### Xero authentication fails
- Check `.env` has correct `XERO_CLIENT_ID`
- Verify redirect URI matches exactly: `http://localhost:3000/callback`
- Delete `.xero-token.json` and re-authenticate

### MCP servers not loading
- Run `/mcp` in Claude Code to check MCP server status
- Ensure you're running Claude Code from this directory
- Check that dependencies are installed: `npm install`

### Clockify MCP not working
- Verify API key is correct in `.mcp.json`
- Use `mcp_clockify@latest` (not other Clockify packages)
- Get API key from [Clockify Settings](https://app.clockify.me/user/settings)
- Check that projects are marked as billable in Clockify if they should be invoiced

## Acknowledgments

This project relies on several excellent tools and libraries:

- [Codex](https://openai.com/codex) and [Claude Code](https://claude.ai/claude-code) - AI coding agents that orchestrate the workflows
- Gmail plugin/app (`@gmail`) - Gmail search, read, attachment, and label actions
- [xero-node](https://github.com/XeroAPI/xero-node) - Official Xero API SDK
- [amazon-orders](https://github.com/alexdlaird/amazon-orders) - Amazon order history library (via [amazon-order-mcp](https://github.com/muness/amazon-order-mcp))
- [mcp_clockify](https://www.npmjs.com/package/mcp_clockify) - Clockify MCP server for time tracking integration

## License

MIT
