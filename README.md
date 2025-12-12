# Expense Agent

Process starred Gmail emails into Xero expenses using Claude Code.

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
   - **Integration type**: Web app
   - **Company or application URL**: http://localhost
   - **Redirect URI**: http://localhost:3000/callback
4. After creation, note your:
   - **Client ID**
   - **Client Secret** (generate one)
5. Create a `.env` file in this project:
   ```
   XERO_CLIENT_ID=your_client_id
   XERO_CLIENT_SECRET=your_client_secret
   ```

### 3. First Run

Start Claude Code in this directory:

```bash
cd /path/to/expenses
claude
```

The first time you use Xero tools, it will open a browser for OAuth authentication.

## Usage

Star emails in Gmail that contain invoices/receipts, then run Claude Code and say:

> Process my starred expense emails

Claude will:
1. Fetch your starred emails
2. Identify which ones look like invoices
3. Extract vendor, amount, date from attachments using vision
4. Create bills (expenses) in Xero
5. Report what was processed

### Example Commands

- "Show me my starred emails" - List starred emails
- "Process my starred expense emails" - Full workflow
- "What Xero accounts can I use for expenses?" - List expense account codes
- "Create an expense for $50 from Acme Corp for office supplies" - Manual entry

## Available Tools

### Gmail (via @gongrzhe/server-gmail-autoauth-mcp)
- Search and list emails
- Read email content and attachments
- Download attachments
- Mark emails as read/starred

### Xero Expenses (local MCP server)
- `xero_list_accounts` - List expense account codes
- `xero_list_contacts` - Search for vendors
- `xero_create_bill` - Create a bill/expense

## Project Structure

```
expenses/
├── .env                   # Your API credentials (not in git)
├── .env.example           # Template
├── .gitignore
├── .mcp.json              # MCP server configuration
├── .xero-token.json       # Xero OAuth tokens (not in git)
├── xero-expenses-mcp.js   # Local Xero MCP server
├── package.json
└── README.md
```

## Troubleshooting

### Gmail authentication fails
- Ensure `gcp-oauth.keys.json` is in `~/.gmail-mcp/`
- Run `npx @gongrzhe/server-gmail-autoauth-mcp auth` to re-authenticate
- Check that Gmail API is enabled in Google Cloud Console
- Verify you added yourself as a test user in OAuth consent screen

### Xero authentication fails
- Check `.env` has correct XERO_CLIENT_ID and XERO_CLIENT_SECRET
- Verify redirect URI matches exactly: `http://localhost:3000/callback`
- Delete `.xero-token.json` and re-authenticate

### MCP servers not loading
- Run `/mcp` in Claude Code to check MCP server status
- Ensure you're running Claude Code from this directory
- Check that dependencies are installed: `npm install`
