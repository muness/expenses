# Process Business Expense Emails (Batched)

Process starred Gmail emails into Xero expenses. These are **business expenses for tax purposes**.

## Instructions

1. **List starred emails** (metadata only: subject, sender, attachment names) - skip any with "xero/processed" or "xero/skipped" labels
2. **For each email**, decide based on metadata:
   - If has PDF/image attachment: download ONLY the attachment to `/tmp/`, use vision to extract vendor, amount, date, description
   - If no attachment: then read email body, parse for the same info, generate PDF from body
   - **Do NOT fetch full email content unless needed** - attachment name + sender is usually enough to identify invoices
3. **If it's a receipt/invoice**:
   - Show me: vendor, amount, date, description (one line)
   - Create receipt using `xero_create_receipt` (**NOT** `xero_create_expense_claim`)
   - Attach the PDF using `xero_attach_file_to_receipt`
   - Label email "xero/processed", unstar
   - **Save the receiptId** for batching at the end
4. **If not a receipt/invoice**: label "xero/skipped", unstar, tell me briefly why
5. **Automatically continue** to the next starred email until none remain
6. **After ALL receipts created**: Inform the user they can see all the expenses under the current claim.

## PDF Handling

- **Email has PDF/image attachment**: Download using `gmail.download_attachment` to `/tmp/`
- **Email has no attachment**: Generate a PDF from the email body using `node html-to-pdf.cjs`
- ALWAYS do at least one of the above (you may find more than one, attach them all)

**The email and its attachments are the SOURCE OF TRUTH** - extract all data (vendor, amount, date) from the email/attachment only. The attached invoice/receipt is the tax documentation. DO NOT MAKE UP RECEIPTS!

There MUST be an attachment.

## Account Codes

- 620: Meals & Entertainment
- 651: Computer & Electronic Expense
- 652: Office Expenses
- 677: eBooks, books, magazine subscriptions
- 678: Software and licenses
- 684: Travel

## Notes

- **Do NOT ask for confirmation** - just process and continue to next
- Be concise - one line summary per email
- **Never guess or infer data** - if amount/vendor unclear from email, ask me
- Get Xero userId by calling `xero_list_users` (cache it for the session)
- Create Gmail labels if they don't exist
- Always attach the receipt PDF to the receipt

## Final Output

Show a summary table with all receipts, then confirm the single batched expense claim was created with the total amount.
