# Process Business Expense Emails

Process queued Gmail and Outlook emails into Xero expenses. These are **business expenses for tax purposes**.

Before starting, load the business identity from the project `.env` or its mounted 1Password Environment: `EXPENSE_OWNER_NAME`, `EXPENSE_OWNER_EMAIL`, and `XERO_EXPENSE_USER_ID`. Use the configured Xero user ID, and verify it against `xero_list_users`; never use the first returned user. Do not hardcode the person's name, email, or Xero user ID in this recipe.

## Instructions

0. **Use the configured mail connectors only**:
   - Gmail: use configured Gmail plugin/app (`@gmail`)
     - Search with Gmail-native `search_emails`
     - Read shortlisted message bodies with `batch_read_email` or `read_email`
     - Read message attachments with `read_attachment`
     - Apply/remove labels with Gmail plugin label actions
     - Do **not** use the legacy Gmail MCP server or `~/.gmail-mcp` credentials
   - Outlook/O365: use the Outlook Email connector
     - List the curated queue with `list_messages` using `filter="flag/flagStatus eq 'flagged'"` and `order_by="receivedDateTime desc"`
     - Also search Outlook with `search_messages` for recent likely receipt/invoice terms, because O365-only invoices are not always flagged
     - Read shortlisted message bodies with `fetch_message` or `fetch_messages_batch`
     - Read attachments with `list_attachments` then `fetch_attachment`
     - Track processed/skipped state with Outlook categories named `xero/processed` and `xero/skipped`
     - Create missing Outlook categories before applying them
     - Preserve any existing Outlook categories when adding `xero/processed` or `xero/skipped`; the Outlook category write replaces the full category list
     - The Outlook connector may not support clearing flags; if no unflag action is available, leave the flag and rely on categories to prevent reprocessing
1. **List queued emails** from both sources:
   - Gmail queue: starred Gmail messages, excluding `xero/processed` and `xero/skipped`
   - Outlook queue/candidates:
     - Flagged Outlook messages, excluding categories `xero/processed` and `xero/skipped`
     - Recent targeted Outlook searches for terms such as `receipt`, `invoice`, `paid`, `payment`, `bill`, `subscription`, `order confirmation`, and `hasattachment:true`
     - Known O365-only expense senders such as `subscription.notifications@post.xero.com` and `microsoft-noreply@microsoft.com`
     - Start with the current and previous month, then expand the date window if the user says something is missing
     - Dedupe Outlook candidates by message id before processing
   - Use metadata first: subject, sender, timestamp, category/label state, and attachment names
   - For Outlook category verification, prefer `list_messages` or broader mailbox scans if single-message fetch returns `categories: null`
2. **For each email**, decide based on metadata:
   - If has PDF/image attachment: download ONLY the attachment to `/tmp/`, use vision to extract vendor, amount, date, description
   - If no attachment: then read email body, parse for the same info, generate PDF from body
   - **Do NOT fetch full email content unless needed** - attachment name + sender is usually enough to identify invoices
   - **Receipt-link notifications count as receipt candidates**: starred Gmail messages, flagged Outlook messages, SMS/text notifications, forwarded messages, or plain notifications with wording like "view receipt", "paid", "invoice", "receipt", "order", "ticket", or a plausible receipt/invoice URL must be treated as possible receipts/invoices. Do **not** skip them from metadata alone just because the sender is Google Voice, SMS, a notification service, or a generic relay.
   - If metadata is not enough but the sender/subject could plausibly contain a receipt/invoice link, read the body, follow/render the linked receipt/invoice page, extract vendor/amount/date/description from that linked source, and generate/attach a PDF of the rendered receipt/invoice.
   - For Xero-hosted subscription invoices in Outlook, render the public `in.xero.com` invoice page when the email body does not include the amount.
3. **If it's a receipt/invoice**:
   - Show me: source mailbox, vendor, amount, date, description (one line)
   - Create receipt using `xero_create_receipt` (**NOT** `xero_create_expense_claim`)
   - Attach the PDF using `xero_attach_file_to_receipt`
   - Gmail: label email `xero/processed`, unstar
   - Outlook: add category `xero/processed`; leave the flag if no unflag action is available
   - Save the receiptId for the final report
4. **If not a receipt/invoice**:
   - Gmail: label `xero/skipped` and keep the star
   - Outlook: add category `xero/skipped` and keep the flag only for messages selected into the current expense-review queue; do not bulk-tag unrelated active work/personal mail returned by broad Outlook searches
   - Tell me briefly why
5. **Automatically continue** to the next queued email until none remain in either Gmail or Outlook
6. **After ALL receipts created**: Stop and report the receipt IDs. Do **not** call `xero_submit_expense_claim` unless the user explicitly asks you to submit a claim.

## PDF Handling

- **Gmail email has PDF/image attachment**: Read the supported attachment using the Gmail plugin's `read_attachment` action and save it to `/tmp/`
- **Outlook email has PDF/image attachment**: Use Outlook `list_attachments` metadata first, then `fetch_attachment`, and save the returned file to `/tmp/`
- **Email has no attachment**: Generate a PDF from the email body using `node html-to-pdf.cjs`
- **Email has receipt/invoice link**: Render the linked receipt/invoice page and save a PDF of the rendered page
- ALWAYS do at least one of the above (you may find more than one, attach them all)

**The email, its attachments, and any receipt/invoice links inside the email are the SOURCE OF TRUTH** - extract all data (vendor, amount, date) from the email, attachment, or linked receipt/invoice page only. The attached or linked invoice/receipt is the tax documentation. DO NOT MAKE UP RECEIPTS!

Every Xero receipt MUST have an attachment: use the downloaded attachment when present; otherwise generate a PDF from the email body or the rendered linked receipt/invoice page.

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
- Get the configured `XERO_EXPENSE_USER_ID` and verify it by calling `xero_list_users` (cache it for the session). Never default to the first returned Xero user; stop if the configured user is not present or its email does not match `EXPENSE_OWNER_EMAIL`.
- Create/apply Gmail labels through the Gmail plugin if they don't exist
- Create/apply Outlook categories through the Outlook Email connector if they don't exist
- Always attach the receipt PDF to the receipt
- Do not create Xero bills, draft bills, or bill line items in this workflow
- Do not batch receipts into an expense claim or submit an expense claim unless the user explicitly asks for that step

## Final Output

Show a summary table with all created receipts, including source mailbox, receiptId, and total amount. Make clear that no expense claim was submitted unless the user explicitly asked for submission.
