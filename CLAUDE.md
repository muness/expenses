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

### Deprecation Notice
The Expense Claims API is deprecated and will be disabled **February 2026**. Plan to migrate to an alternative solution before then.
