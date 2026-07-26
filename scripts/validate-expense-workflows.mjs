import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const files = {
  agents: "AGENTS.md",
  claude: "CLAUDE.md",
  processExpenses: ".claude/commands/process-expenses.md",
  processBills: ".claude/commands/process-expenses-bills.md",
  processAmazon: ".claude/commands/process-amazon-orders.md",
};

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function assertIncludes(path, text, label = text) {
  const body = read(path);
  if (!body.includes(text)) {
    throw new Error(`${path} is missing required guardrail: ${label}`);
  }
}

function assertNotIncludes(path, text, label = text) {
  const body = read(path);
  if (body.includes(text)) {
    throw new Error(`${path} still contains forbidden workflow text: ${label}`);
  }
}

for (const path of [files.agents, files.claude, files.processExpenses, files.processAmazon]) {
  assertIncludes(path, "XERO_EXPENSE_USER_ID", "configured Xero expense user ID");
  assertIncludes(path, "EXPENSE_OWNER_EMAIL", "configured expense owner email");
}

assertIncludes(files.agents, "there is no hardcoded client list", "client list remains runtime configuration");
assertIncludes(files.claude, "no client list", "client list remains runtime configuration");
for (const path of [files.agents, files.claude, files.processExpenses, files.processAmazon]) {
  assertNotIncludes(path, "muness@217castle.com", "hardcoded owner email");
  assertNotIncludes(path, "830afbab-8e01-4618-9ed2-6197d5768be5", "hardcoded Xero user ID");
}

assertIncludes(
  files.processExpenses,
  "Never default to the first returned Xero user",
  "no first-user default"
);
assertIncludes(
  files.processExpenses,
  "Do not create Xero bills, draft bills, or bill line items in this workflow",
  "receipt workflow must not create bills"
);
assertIncludes(
  files.processExpenses,
  "Do not batch receipts into an expense claim or submit an expense claim unless the user explicitly asks",
  "no automatic claim batching/submission"
);
assertIncludes(
  files.processExpenses,
  "Gmail: use configured Gmail plugin/app (`@gmail`)",
  "Gmail plugin requirement"
);
assertIncludes(
  files.processExpenses,
  "Outlook/O365: use the Outlook Email connector",
  "Outlook connector requirement"
);
assertNotIncludes(
  files.processExpenses,
  "# Process Business Expense Emails (Batched)",
  "batched heading"
);
assertNotIncludes(
  files.processExpenses,
  "confirm the single batched expense claim was created",
  "automatic batched claim final output"
);

assertIncludes(
  files.processBills,
  "Use this workflow only when the user explicitly invokes `process-expenses-bills`",
  "bills workflow explicit-invocation guard"
);
assertIncludes(
  files.processBills,
  "If the user invokes `process-expenses`, asks for expense receipts/claims, asks what to reimburse, or says not to use bills",
  "bills workflow must yield to receipt workflow"
);
assertIncludes(
  files.claude,
  "If the user asks for `/process-expenses`, expense receipts, claims, or reimbursements, do not create Xero bills unless the user explicitly changes the workflow.",
  "shared workflow routing guard"
);
assertIncludes(
  files.agents,
  "`/process-expenses` creates Xero receipts only",
  "repo agent receipt-only guard"
);
assertIncludes(
  files.processAmazon,
  "This workflow creates Xero receipts only. Do not create Xero bills, draft bills, or bill line items unless the user explicitly switches to `process-expenses-bills`.",
  "Amazon workflow receipt-only guard"
);
assertIncludes(
  files.processAmazon,
  "Do not batch receipts into an expense claim or submit an expense claim unless the user explicitly asks",
  "Amazon workflow no automatic claim batching/submission"
);
assertNotIncludes(
  files.processAmazon,
  "**Bills workflow**",
  "Amazon receipt workflow must not contain bills workflow directive"
);

console.log("Expense workflow guardrails OK");
