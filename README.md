# Expense Agent

Process Gmail receipts and Amazon orders into Xero expenses using Claude Code.

## Features

- **Gmail Expenses**: Star emails with receipts/invoices, run `/process-expenses` to create Xero receipts
- **Amazon Orders**: Run `/process-amazon-orders` to review recent Amazon purchases and expense business items

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

### 3. Amazon Orders (Optional)

To process Amazon orders, add your Amazon credentials to `.env`:

```
AMAZON_USERNAME=your-amazon-email@example.com
AMAZON_PASSWORD=your-amazon-password
```

See [amazon-order-mcp](https://github.com/muness/amazon-order-mcp) for the MCP server.

### 4. First Run

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

### Example Commands

- `"Show me my starred emails"` - List starred emails
- `"What Xero accounts can I use?"` - List expense account codes
- `"Create an expense for $50 from Acme Corp"` - Manual entry

## Project Structure

```
expenses/
├── .claude/commands/        # Slash commands
│   ├── process-expenses.md
│   └── process-amazon-orders.md
├── .env                     # Your credentials (not in git)
├── .env.example             # Template
├── .mcp.json                # MCP server configuration
├── amazon-order-to-pdf.cjs  # PDF generator for Amazon orders
├── html-to-pdf.cjs          # Generic HTML to PDF converter
├── xero-expenses-mcp.js     # Xero MCP server
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
