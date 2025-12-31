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
   - Count entries where `billable: true`
   - Parse durations: `PT8H` = 8 hours, `PT1H` = 1 hour
   - **Show breakdown by project** (with project names from `list-clockify-projects`)
   - **List non-billable entries** that were excluded
   - **Ask user**: "Are any of the non-billable entries actually billable?"
   - Recalculate if needed based on user feedback

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
     - description: "Consulting services - [Month Year] ([X] billable hours @ $[rate]/hour)"
     - date: Last day of month
     - dueDate: 30 days later
     - accountCode: "200"
     - reference: "[MONTH-ABBREV]-[YEAR]" (e.g., "DEC-2025")

6. **Output invoice details**: number, amount, status, due date

## Notes

- **Never hardcode client name or rate** - always prompt for them
- Invoice created as DRAFT - user reviews in Xero before sending
- If Clockify has wrong billable flags, suggest updating project settings
- Be concise - show summary tables, not verbose explanations
