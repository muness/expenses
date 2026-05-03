# Expenses Project

## MCP Server

The MCP server lives at `/Users/muness1/src/xero-expenses-mcp/index.js`. If the current functionality doesn't meet the user's needs, update the MCP code there directly.

### Current Capabilities

**Bills (recommended - survives Feb 2026 deprecation):**
- `xero_create_bill` - Create a DRAFT bill (accounts payable)
- `xero_list_draft_bills` - Find existing draft bills to add expenses to
- `xero_get_bill` - Get bill details including line items
- `xero_add_line_item_to_bill` - Add an expense line item to existing DRAFT bill
- `xero_submit_bill` - Change DRAFT to SUBMITTED (shows as "Awaiting Approval" in Xero UI)
- `xero_attach_file` - Attach receipt PDFs to bills

**Expense Claims (deprecated Feb 2026):**
- `xero_list_users` - List users (for expense claims)
- `xero_create_receipt` - Create a receipt
- `xero_attach_file_to_receipt` - Attach files to receipts
- `xero_submit_expense_claim` - Batch receipts into expense claim

**Sales Invoices:**
- `xero_create_invoice` - Create a DRAFT sales invoice (accounts receivable)
- `xero_list_draft_invoices` - Find draft sales invoices by customer/reference
- `xero_get_invoice` - Get sales invoice details including line items
- `xero_update_draft_invoice` - Correct a DRAFT sales invoice as one consolidated invoice with one line item
- `xero_delete_draft_invoice` - Delete an incorrect DRAFT sales invoice


**Other:**
- `xero_list_accounts` - List expense account categories
- `xero_list_bank_accounts` - List bank accounts
- `xero_list_contacts` - Search vendors/contacts
- `xero_create_expense` - Create spend money transactions (DO NOT USE - see below)

### Re-authentication
If OAuth scopes are modified, delete `/Users/muness1/src/xero-expenses-mcp/.xero-token.json` to force re-authentication with the new scopes.

### IMPORTANT: Do NOT Use `xero_create_expense`
`xero_create_expense` creates bank transactions (spend money) - that's for expenses paid directly from a business bank account. The user's expenses are paid via **personal credit card** and need reimbursement.

## Expense Workflows

### Recommended: Bills Workflow (future-proof)
Use `/process-expenses-bills` command. Survives Feb 2026 deprecation.

1. `xero_list_draft_bills` - find existing draft or create new with `xero_create_bill`
2. For each expense: `xero_add_line_item_to_bill` + `xero_attach_file`
3. **STOP** - report the bill total and wait
4. Only call `xero_submit_bill` when user explicitly asks

Vendor for the bill = "Muness Castle" (self-billing for reimbursement).

**IMPORTANT: Xero has a 10 attachment limit per bill.** When processing more than 9 expenses:
- Create multiple bills with ≤9 line items each
- Name them descriptively: "Expenses [Month Year] - Part 1 (Category)", "Part 2 (Category)", etc.
- Group by category (Software, Electronics, Meals) when possible for cleaner organization

### Legacy: Expense Claims Workflow (deprecated Feb 2026)
Use `/process-expenses` command.

1. `xero_create_receipt` for each expense
2. `xero_attach_file_to_receipt` to attach the PDF
3. **STOP** - report the receipt IDs to the user and wait
4. Only call `xero_submit_expense_claim` when user explicitly asks

Get Xero user ID by calling `xero_list_users`.

### Critical Rules (both workflows)
- **Do NOT automatically submit** - user may have more expenses to add
- All expenses paid via personal credit card, not business bank account

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
