# Generate Invoice from Clockify Hours

Generate a Xero invoice based on Clockify time entries for a specific month.

## Instructions

1. **Ask for parameters**:
   - Month and year (default to current/previous month)
   - Client name in Xero
   - Hourly rate

2. **Fetch Clockify time entries**:
   - Get workspace and userId using `get-clockify-user` and `list-clockify-workspaces`
   - Fetch entries for the month: `list-clockify-time-entries` with date range (first to last day of month in UTC)

3. **Calculate billable hours**:
   - Parse durations: `PT8H` = 8 hours, `PT1H` = 1 hour
   - **Show ALL entries by project** — both billable=true and billable=false
   - **Do NOT assume billable=false means non-billable to the client** — Clockify flags may not reflect the actual billing arrangement
   - Ask user to confirm which projects/entries to include before calculating total
   - Recalculate based on user confirmation
   - If the user says “all hours” or corrects an exclusion, include every Clockify entry for the month regardless of Clockify billable flag

4. **Show summary**:
   ```
   Total billable hours: [X] hours
   Hourly rate: $[rate]
   Invoice amount: $[total]

   Breakdown:
   - [Project Name]: [Y] hours
   - [Project Name]: [Z] hours

   Excluded (non-billable):
   - [Project Name]: [N] hours
   ```

5. **Create invoice** (after user confirms):
   - Search client: `xero_list_contacts` with client name
   - Create invoice: `xero_create_invoice`:
   - **Create exactly one invoice with exactly one line item** for the total confirmed hours
   - **Do not create supplemental adjustment invoices** unless the user explicitly requests separate invoices
   - If an invoice was created with the wrong hours and is still DRAFT, update/delete/recreate so the final state is one consolidated draft invoice
     - quantity: [X] (total billable hours)
     - unitPrice: [rate] (hourly rate)
     - description: "Consulting services - [Month Year]"
     - date: Last day of month
     - dueDate: 30 days later
     - accountCode: "200"
     - reference: "[MONTH-ABBREV]-[YEAR]" (e.g., "DEC-2025")

6. **Output invoice details**: number, amount, status, due date

7. **Ask about nonworked-hours completeness entries**:
   - After invoice creation, ask whether the user wants nonworked hours recorded for completeness checks
   - Do not mention client names in this prompt
   - If yes, use the Clockify MCP to:
     - Find the non-billable/nonworking project/task
     - Calculate gaps needed so each relevant work week shows 40 total recorded hours
     - Create billable=false entries for the gap hours only
     - Prefer the nonworking task when the MCP supports task assignment; otherwise use the nonworking project and description

## Notes

- **Never hardcode client name or rate** - always prompt for them
- Invoice created as DRAFT - user reviews in Xero before sending
- **Clockify billable flags are unreliable** - always show all hours and confirm with user which to include
- Suggest fixing Clockify project settings if flags are consistently wrong
- Be concise - show summary tables, not verbose explanations
- Default correction path: one consolidated draft invoice, one line item, all user-confirmed monthly hours
- After creating the invoice, ask whether to add nonworked-hours completeness entries; keep that prompt generic and client-name-free
