# Expenses Project

This repo has project-specific Claude command recipes in `.claude/commands/`.
Treat them as Codex skills only while working in this repository.

When a user asks for one of these workflows, read the matching command file completely before acting:

- Invoice from Clockify: `.claude/commands/generate-invoice-from-clockify.md`
- Amazon expenses: `.claude/commands/process-amazon-orders.md`
- Expense bills workflow: `.claude/commands/process-expenses-bills.md`
- Legacy expense receipts workflow: `.claude/commands/process-expenses.md`

The `.agents/skills/*/source.md` files symlink to those recipes for convenience. Do not apply these skills outside this repo.

Use the 1Password MCP server for project secrets and environment management when available. Do not ask the user to paste credentials, API keys, or OTP seeds into chat. 1Password's MCP server can manage Environments and mounted `.env` files without exposing raw secret values to Codex.

Use the configured Gmail plugin/app (`@gmail`) for Gmail access. Do not use the legacy Gmail MCP server or local Gmail OAuth files for the expense workflows. For starred expense email processing, search Gmail with native Gmail query syntax, read shortlisted messages with the Gmail plugin, read attachments through the plugin's attachment tool, and apply/remove Gmail labels through the plugin's label actions.

Business identity configuration:

- Load `EXPENSE_OWNER_NAME`, `EXPENSE_OWNER_EMAIL`, `XERO_EXPENSE_USER_ID`, and `XERO_REIMBURSEMENT_VENDOR` from the project `.env` or a mounted 1Password Environment. Do not hardcode these values in prompts, scripts, or reports.
- Invoice client names and hourly rates are runtime inputs to `/generate-invoice-from-clockify`; there is no hardcoded client list in this repo.

Guardrails for Xero expense workflows:

- `/process-expenses` creates Xero receipts only, using the configured `XERO_EXPENSE_USER_ID`. Verify it against `xero_list_users`; never default to the first user returned by Xero.
- `/process-expenses` must not create Xero bills, draft bills, bill line items, or submit/batch an expense claim unless the user explicitly asks for that separate step.
- `/process-expenses-bills` is only for explicit bill workflow requests.
- After changing expense workflow instructions, run `npm run validate:workflows`.
