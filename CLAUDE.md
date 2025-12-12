# Expenses Project

## MCP Server

The `xero-expenses-mcp.js` file is a custom MCP server that I (Claude) own and can modify. If the current functionality doesn't meet the user's needs, I should update the MCP code directly.

### Current Capabilities
- `xero_list_accounts` - List expense account categories
- `xero_list_bank_accounts` - List bank accounts
- `xero_list_contacts` - Search vendors/contacts
- `xero_list_users` - List users (for expense claims)
- `xero_create_bill` - Create accounts payable (unpaid invoices)
- `xero_create_expense` - Create spend money transactions (already-paid from bank)
- `xero_create_expense_claim` - Create expense claim for reimbursement (creates receipt + submits claim)
- `xero_attach_file` - Attach files to bills
- `xero_attach_file_to_expense` - Attach files to spend money transactions
- `xero_attach_file_to_receipt` - Attach files to receipts (for expense claims)

### Re-authentication
If OAuth scopes are modified in `xero-expenses-mcp.js`, delete `.xero-token.json` to force re-authentication with the new scopes.

### Expense Claim User
Get the Xero user ID by calling `xero_list_users` and use the appropriate user for expense claims.

### Deprecation Notice
The Expense Claims API is deprecated and will be disabled **February 2026**. Plan to migrate to an alternative solution before then.

## HTML to PDF Tool

The `html-to-pdf.cjs` script converts HTML files to PDF using Puppeteer (headless Chrome). Use this to convert email receipts to PDF format for tax records.

### Usage
```bash
# Basic - outputs to same directory with .pdf extension
node html-to-pdf.cjs /tmp/receipt.html

# Specify output path
node html-to-pdf.cjs /tmp/receipt.html /tmp/receipt.pdf
```

### When to Use
- Email receipts that are HTML-only (no PDF attachment)
- Preserves original email content for tax purposes
- Outputs A4 format with margins
