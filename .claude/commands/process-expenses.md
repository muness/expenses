# Process Starred Expense Emails

Process starred Gmail emails one at a time into Xero expenses.

## Instructions

1. **Get the first starred email** using gmail MCP (limit 1), skip any with "xero/processed" or "xero/skipped" labels
2. **Analyze it**:
   - If it has an attachment (PDF/image): download it, use vision to extract vendor, amount, date, description
   - If no attachment: parse email body for the same info
3. **If it's an invoice**:
   - Show me: vendor, amount, date, description (one line)
   - Ask if I want to create it in Xero
   - If yes: create bill, attach the file, label "xero/processed", unstar
4. **If not an invoice**: label "xero/skipped" (keep starred), tell me briefly why
5. **Ask if I want to process the next one**

## Notes
- One email at a time - ask before moving to next
- Be concise - just the key fields, no dumps
- Account code "400" unless you can infer better
- Create labels if they don't exist
