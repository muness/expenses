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
     - quantity: [X] (total billable hours)
     - unitPrice: [rate] (hourly rate)
     - description: "Consulting services - [Month Year]"
     - date: Last day of month
     - dueDate: 30 days later
     - accountCode: "200"
     - reference: "[MONTH-ABBREV]-[YEAR]" (e.g., "DEC-2025")

6. **Output invoice details**: number, amount, status, due date

## Notes

- **Never hardcode client name or rate** - always prompt for them
- Invoice created as DRAFT - user reviews in Xero before sending
- **Clockify billable flags are unreliable** - always show all hours and confirm with user which to include
- Suggest fixing Clockify project settings if flags are consistently wrong
- Be concise - show summary tables, not verbose explanations
