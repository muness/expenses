# Process Starred Expense Emails

Process starred Gmail emails one at a time into Xero expense claims for reimbursement.

## Instructions

1. **Get the first starred email** using gmail MCP (limit 1), skip any with "xero/processed" or "xero/skipped" labels
2. **Analyze it**:
   - If it has an attachment (PDF/image): download it to `/tmp/`, use vision to extract vendor, amount, date, description
   - If no attachment: parse email body for the same info, then generate a PDF receipt from the email content
3. **If it's a receipt/invoice**:
   - Show me: vendor, amount, date, description (one line)
   - Ask if I want to create it in Xero
   - If yes:
     1. Create expense claim using `xero_create_expense_claim`
     2. Attach the PDF (downloaded or generated) using `xero_attach_file_to_receipt`
     3. Label email "xero/processed", unstar
4. **If not a receipt/invoice**: label "xero/skipped" (keep starred), tell me briefly why
5. **Ask if I want to process the next one**

## PDF Handling
- **Email has PDF/image attachment**: Download using `gmail.download_attachment` to `/tmp/`
- **Email has no attachment**: Generate a PDF from the email body using a tool like `puppeteer` or write HTML to file and convert

## Notes
- One email at a time - ask before moving to next
- Be concise - just the key fields, no dumps
- Use appropriate expense account codes (e.g., "620" for Meals & Entertainment)
- Meal/restaurant expenses should be categorized as "Business Meals" (account 620)
- Create labels if they don't exist
- Use `xero_create_expense_claim` for receipts (creates reimbursable expense claim)
- Use `xero_create_bill` only for unpaid invoices (creates accounts payable)
- Always attach the receipt PDF to the expense claim
