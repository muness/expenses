#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const emitWarning = process.emitWarning.bind(process);
process.emitWarning = (warning, ...args) => {
  const message = typeof warning === 'string' ? warning : warning?.message || '';
  const type = typeof args[0] === 'string' ? args[0] : warning?.name || '';
  if (type === 'ExperimentalWarning' && message.includes('SQLite')) return;
  emitWarning(warning, ...args);
};

const { DatabaseSync } = await import('node:sqlite');

const root = process.cwd();
const defaultJsonPath = path.join(root, 'amazon-order-status.json');
const defaultDbPath = path.join(root, 'amazon-order-status.sqlite');

function usage() {
  console.log(`Usage:
  node scripts/amazon-status.mjs migrate [--json amazon-order-status.json] [--db amazon-order-status.sqlite]
  node scripts/amazon-status.mjs summary [--db amazon-order-status.sqlite]
  node scripts/amazon-status.mjs get <order_number> [--db amazon-order-status.sqlite]
  node scripts/amazon-status.mjs upsert <order_number> '<json>' [--db amazon-order-status.sqlite]`);
}

function optionValue(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function openDb(dbPath) {
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS amazon_order_status (
      order_number TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      item TEXT,
      amount_cents INTEGER,
      amount_text TEXT,
      order_date TEXT,
      confidence INTEGER,
      receipt_id TEXT,
      pdf_path TEXT,
      reason TEXT,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_amazon_order_status_status
      ON amazon_order_status(status);
    CREATE INDEX IF NOT EXISTS idx_amazon_order_status_order_date
      ON amazon_order_status(order_date);
    CREATE INDEX IF NOT EXISTS idx_amazon_order_status_receipt_id
      ON amazon_order_status(receipt_id);
  `);
  return db;
}

function amountToCents(amount) {
  if (amount == null || amount === '') return null;
  const value = Number(String(amount).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

function normalize(orderNumber, record) {
  return {
    orderNumber,
    status: record.status || 'unknown',
    item: record.item || null,
    amountCents: amountToCents(record.amount),
    amountText: record.amount || null,
    orderDate: record.date || null,
    confidence: Number.isInteger(record.confidence) ? record.confidence : null,
    receiptId: record.receiptId || null,
    pdfPath: record.pdfPath || null,
    reason: record.reason || null,
    payloadJson: JSON.stringify(record),
  };
}

function upsert(db, orderNumber, record) {
  const row = normalize(orderNumber, record);
  db.prepare(`
    INSERT INTO amazon_order_status (
      order_number, status, item, amount_cents, amount_text, order_date,
      confidence, receipt_id, pdf_path, reason, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(order_number) DO UPDATE SET
      status = excluded.status,
      item = excluded.item,
      amount_cents = excluded.amount_cents,
      amount_text = excluded.amount_text,
      order_date = excluded.order_date,
      confidence = excluded.confidence,
      receipt_id = excluded.receipt_id,
      pdf_path = excluded.pdf_path,
      reason = excluded.reason,
      payload_json = excluded.payload_json,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    row.orderNumber,
    row.status,
    row.item,
    row.amountCents,
    row.amountText,
    row.orderDate,
    row.confidence,
    row.receiptId,
    row.pdfPath,
    row.reason,
    row.payloadJson,
  );
}

function migrate(args) {
  const jsonPath = optionValue(args, '--json', defaultJsonPath);
  const dbPath = optionValue(args, '--db', defaultDbPath);
  const source = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const orders = source.orders || {};
  const db = openDb(dbPath);
  db.exec('BEGIN');
  try {
    for (const [orderNumber, record] of Object.entries(orders)) {
      upsert(db, orderNumber, record);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  const count = db.prepare('SELECT COUNT(*) AS count FROM amazon_order_status').get().count;
  db.close();
  console.log(JSON.stringify({ dbPath, imported: Object.keys(orders).length, totalRows: count }, null, 2));
}

function summary(args) {
  const dbPath = optionValue(args, '--db', defaultDbPath);
  const db = openDb(dbPath);
  const rows = db.prepare(`
    SELECT status, COUNT(*) AS count, COALESCE(SUM(amount_cents), 0) AS amount_cents
    FROM amazon_order_status
    GROUP BY status
    ORDER BY status
  `).all();
  db.close();
  console.table(rows.map((row) => ({
    status: row.status,
    count: row.count,
    amount: `$${(row.amount_cents / 100).toFixed(2)}`,
  })));
}

function getOrder(args) {
  const orderNumber = args[1];
  if (!orderNumber) {
    usage();
    process.exit(1);
  }
  const dbPath = optionValue(args, '--db', defaultDbPath);
  const db = openDb(dbPath);
  const row = db.prepare('SELECT payload_json FROM amazon_order_status WHERE order_number = ?').get(orderNumber);
  db.close();
  if (!row) {
    process.exitCode = 1;
    console.error(`No status found for ${orderNumber}`);
    return;
  }
  console.log(JSON.stringify(JSON.parse(row.payload_json), null, 2));
}

function upsertOrder(args) {
  const orderNumber = args[1];
  const json = args[2];
  if (!orderNumber || !json) {
    usage();
    process.exit(1);
  }
  const dbPath = optionValue(args, '--db', defaultDbPath);
  const db = openDb(dbPath);
  upsert(db, orderNumber, JSON.parse(json));
  db.close();
  console.log(JSON.stringify({ orderNumber, status: 'upserted', dbPath }, null, 2));
}

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'migrate':
    migrate(args);
    break;
  case 'summary':
    summary(args);
    break;
  case 'get':
    getOrder(args);
    break;
  case 'upsert':
    upsertOrder(args);
    break;
  default:
    usage();
    process.exit(command ? 1 : 0);
}
