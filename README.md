# Expense Agent

Process Gmail receipts and Amazon orders into Xero expenses using Claude Code.

## Requirements

- [Claude Code](https://claude.ai/claude-code) CLI
- Node.js 18+
- Xero account
- Gmail account
- Clockify account (optional, for invoice generation)

## Features

- **Gmail Expenses**: Star emails with receipts/invoices, run `/process-expenses` to create Xero receipts
- **Amazon Orders**: Run `/process-amazon-orders` to review recent Amazon purchases and expense business items
- **Invoice Generation**: Run `/generate-invoice-from-clockify` to create Xero invoices from Clockify time entries

## Setup

### 1. Gmail API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the Gmail API:
   - Navigate to **APIs & Services** → **Library**
   - Search for "Gmail API" → Click **Enable**
4. Configure OAuth consent screen:
   - Go to **APIs & Services** → **OAuth consent screen**
   - Choose **External** (or **Internal** if using Google Workspace)
   - Fill in app name and your email
   - Add scope: `https://www.googleapis.com/auth/gmail.modify`
   - Add yourself as a test user
5. Create OAuth credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth Client ID**
   - Application type: **Desktop app**
   - Download the JSON file
   - Rename to `gcp-oauth.keys.json`
6. Run Gmail authentication:
   ```bash
   mkdir -p ~/.gmail-mcp
   mv gcp-oauth.keys.json ~/.gmail-mcp/
   npx @gongrzhe/server-gmail-autoauth-mcp auth
   ```

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

### 5. First Run

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

### Gmail authentication fails
- Ensure `gcp-oauth.keys.json` is in `~/.gmail-mcp/`
- Run `npx @gongrzhe/server-gmail-autoauth-mcp auth` to re-authenticate
- Check that Gmail API is enabled in Google Cloud Console

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

- [Claude Code](https://claude.ai/claude-code) by Anthropic - The AI-powered CLI that orchestrates everything
- [@gongrzhe/server-gmail-autoauth-mcp](https://www.npmjs.com/package/@gongrzhe/server-gmail-autoauth-mcp) - Gmail MCP server with auto-authentication
- [xero-node](https://github.com/XeroAPI/xero-node) - Official Xero API SDK
- [amazon-orders](https://github.com/alexdlaird/amazon-orders) - Amazon order history library (via [amazon-order-mcp](https://github.com/muness/amazon-order-mcp))
- [mcp_clockify](https://www.npmjs.com/package/mcp_clockify) - Clockify MCP server for time tracking integration

## License

MIT
