# Process Business Expenses via Bills

Process starred Gmail emails into Xero as bill line items. This is the **future-proof** approach that survives the Feb 2026 Expense Claims API deprecation.

## How It Works

Expenses are added as line items to DRAFT bills. When you're ready to get reimbursed, submit the bills for approval.

**IMPORTANT: Xero has a 10 attachment limit per bill.** When processing more than 9 expenses, create multiple bills:
- Bill 1: First 9 expenses (or fewer)
- Bill 2: Next 9 expenses
- etc.

Name them descriptively, e.g., "Expenses January 2026 - Part 1 (Software)", "Expenses January 2026 - Part 2 (Electronics)".

## Instructions

1. **Check for existing draft bill**: Call `xero_list_draft_bills` to see if there's a draft to add to
   - If found, use that bill's `invoiceId`
   - If not, create one with `xero_create_bill` (vendor = "Muness Castle", reference = "Expenses [Month Year]")

2. **List starred emails** (metadata only: subject, sender, attachment names) - skip any with "xero/processed" or "xero/skipped" labels

3. **For each email**, decide based on metadata:
   - If has PDF/image attachment: download ONLY the attachment to `/tmp/`, use vision to extract vendor, amount, date, description
   - If no attachment: read email body, parse for the same info, generate PDF from body
   - **Do NOT fetch full email content unless needed**

4. **If it's a receipt/invoice**:
   - Show me: vendor, amount, date, account code, description (one line)
   - Add to the draft bill using `xero_add_line_item_to_bill`
   - Attach the PDF using `xero_attach_file` (same invoiceId)
   - Label email "xero/processed", unstar

5. **If not a receipt/invoice**: **ASK the user** before labeling skipped — do not auto-skip. Exception: obvious non-expenses like bank reward certificates, personal email exchanges, or renewal *notices* (not receipts) can be skipped with explanation.

6. **Automatically continue** to the next starred email until none remain

7. **After ALL expenses added**: Show summary table and the current bill total. **Do NOT submit** - wait for user to explicitly ask.

## PDF Handling

- **Email has PDF/image attachment**: Download using `gmail.download_attachment` to `/tmp/`
- **Email has no attachment**: Generate a PDF from the email body using `node html-to-pdf.cjs`
- ALWAYS do at least one of the above

**The email and its attachments are the SOURCE OF TRUTH** - extract all data (vendor, amount, date) from the email/attachment only.

## Account Codes

- 620: Meals & Entertainment
- 651: Computer & Electronic Expense
- 652: Office Expenses
- 677: eBooks, books, magazine subscriptions
- 678: Software and licenses
- 684: Travel

## Submitting the Bill

When user asks to submit/finalize:
1. Call `xero_submit_bill` with the invoiceId
2. This changes status from DRAFT to SUBMITTED for approval

## Notes

- **Do NOT ask for confirmation** - just process and continue to next
- Be concise - one line summary per email
- **Never guess or infer data** - if amount/vendor unclear from email, ask me
- Create Gmail labels if they don't exist
- **Max 9 line items per bill** (Xero's 10 attachment limit) - create multiple bills if needed
- Bill vendor should be "Muness Castle" (self-billing for reimbursement)
- **Renewal notices** (e.g. Zoom "your account will renew on...") are NOT receipts — skip them and note the charge will arrive later
- **Amazon gift card orders**: `gift_card` field in order data just means payment method, NOT a return. `grand_total` may be $0 or null when fully paid by gift card — use subtotal+tax-promos as the expense amount. Always ask user if it's a business expense, don't auto-skip.

## Final Output

Show a summary table with all line items added, the bill total, and the invoiceId for reference.
