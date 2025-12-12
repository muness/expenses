# Process Business Expense Emails

Process starred Gmail emails into Xero expense claims. These are **business expenses for tax purposes**.

**The email and its attachments are the SOURCE OF TRUTH** - extract all data (vendor, amount, date) from the email/attachment only. The attached invoice/receipt is the tax documentation.

## Instructions

1. **List starred emails** (metadata only: subject, sender, attachment names) - skip any with "xero/processed" or "xero/skipped" labels
2. **For each email**, decide based on metadata:
   - If has PDF/image attachment: download ONLY the attachment to `/tmp/`, use vision to extract vendor, amount, date, description
   - If no attachment: then read email body, parse for the same info, generate PDF from body
   - **Do NOT fetch full email content unless needed** - attachment name + sender is usually enough to identify invoices
3. **If it's a receipt/invoice**:
   - Show me: vendor, amount, date, description (one line)
   - Create expense claim using `xero_create_expense_claim`
   - Attach the PDF (downloaded or generated) using `xero_attach_file_to_receipt`
   - Label email "xero/processed", unstar
4. **If not a receipt/invoice**: label "xero/skipped" (keep starred), tell me briefly why
5. **Automatically continue** to the next starred email until none remain

## PDF Handling
- **Email has PDF/image attachment**: Download using `gmail.download_attachment` to `/tmp/`
- **Email has no attachment**: Generate a PDF from the email body using a tool like `puppeteer` or write HTML to file and convert

## Notes
- **Do NOT ask for confirmation** - just process and continue to next
- Be concise - one line summary per email
- **Never guess or infer data** - if amount/vendor unclear from email, ask me
- Meal/restaurant expenses → "Business Meals" (account 620)
- Create labels if they don't exist
- Always attach the receipt PDF to the expense claim
