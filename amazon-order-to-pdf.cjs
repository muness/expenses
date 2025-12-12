#!/usr/bin/env node
/**
 * Amazon Order to PDF Generator
 *
 * Generates PDF invoices from Amazon order data for Xero receipt attachments.
 *
 * Usage:
 *   node amazon-order-to-pdf.cjs <order-json-file> [output-dir]
 *
 * Or import and use programmatically:
 *   const { generateOrderPdf, generateOrderHtml } = require('./amazon-order-to-pdf.cjs');
 *
 * Order JSON format:
 * {
 *   "order_number": "111-1234567-1234567",
 *   "order_placed_date": "2025-12-01",
 *   "grand_total": "50.36",
 *   "subtotal": "46.63",
 *   "shipping_total": "0.0",
 *   "estimated_tax": "3.73",
 *   "total_before_tax": "46.63",
 *   "payment_method": "Prime Visa",
 *   "payment_method_last_4": "1234",
 *   "coupon_savings": "-2.55",        // optional
 *   "subscription_discount": "-2.81", // optional
 *   "recipient": {
 *     "name": "John Doe",
 *     "address": "123 Main St\nCity, ST 12345\nUnited States"
 *   },
 *   "items": [
 *     { "title": "Product Name", "price": "29.99", "seller": "Amazon.com", "quantity": 1 }
 *   ]
 * }
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

/**
 * Format a date string to "Month Day, Year" format
 */
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Parse recipient address from Amazon's format
 */
function parseAddress(recipient) {
  const name = recipient.name || 'Unknown';
  let address = recipient.address || '';

  // Clean up Amazon's messy address format
  address = address
    .replace(recipient.name, '')
    .replace(/\n+/g, '\n')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return { name, lines: address };
}

/**
 * Generate HTML for an Amazon order summary
 */
function generateOrderHtml(order) {
  const recipient = parseAddress(order.recipient);
  const orderDate = formatDate(order.order_placed_date);

  // Build summary rows
  let summaryRows = '';

  if (order.subtotal) {
    summaryRows += `<div class="summary-row"><span>Item(s) Subtotal:</span><span>$${order.subtotal}</span></div>`;
  }

  if (order.coupon_savings) {
    summaryRows += `<div class="summary-row"><span>Coupon Savings:</span><span>${order.coupon_savings}</span></div>`;
  }

  if (order.subscription_discount) {
    summaryRows += `<div class="summary-row"><span>Subscribe & Save:</span><span>${order.subscription_discount}</span></div>`;
  }

  if (order.promotion_applied) {
    summaryRows += `<div class="summary-row"><span>Promotion:</span><span>${order.promotion_applied}</span></div>`;
  }

  const shipping = parseFloat(order.shipping_total || 0);
  summaryRows += `<div class="summary-row"><span>Shipping & Handling:</span><span>$${shipping.toFixed(2)}</span></div>`;

  if (shipping > 0 && order.subtotal) {
    // Check if free shipping was applied
    const subtotal = parseFloat(order.subtotal);
    const totalBeforeTax = parseFloat(order.total_before_tax || subtotal);
    if (totalBeforeTax < subtotal + shipping) {
      summaryRows += `<div class="summary-row"><span>Free Shipping:</span><span>-$${shipping.toFixed(2)}</span></div>`;
    }
  }

  if (order.total_before_tax) {
    summaryRows += `<div class="summary-row"><span>Total before tax:</span><span>$${order.total_before_tax}</span></div>`;
  }

  if (order.estimated_tax) {
    summaryRows += `<div class="summary-row"><span>Estimated tax:</span><span>$${order.estimated_tax}</span></div>`;
  }

  summaryRows += `<div class="summary-row total"><span>Grand Total:</span><span>$${order.grand_total}</span></div>`;

  // Build items HTML
  let itemsHtml = '';
  if (order.items && order.items.length > 0) {
    for (const item of order.items) {
      const qty = item.quantity && item.quantity > 1 ? ` (Qty: ${item.quantity})` : '';
      itemsHtml += `
  <div class="item-box">
    <div class="item-title">${escapeHtml(item.title)}${qty}</div>
    <div class="item-detail">Sold by: ${escapeHtml(item.seller || 'Amazon.com')}</div>
    <div class="item-price">$${item.price}</div>
  </div>`;
    }
  }

  // Payment method
  const paymentMethod = order.payment_method
    ? `${order.payment_method} ending in ${order.payment_method_last_4}`
    : 'Unknown';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; font-size: 14px; }
    h1 { font-size: 28px; font-weight: normal; margin-bottom: 5px; }
    .order-info { color: #555; margin-bottom: 20px; }
    .details-box { border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; display: flex; }
    .details-box > div { flex: 1; }
    .section-title { font-weight: bold; margin-bottom: 10px; }
    .summary-row { display: flex; justify-content: space-between; margin: 3px 0; }
    .summary-row.total { font-weight: bold; border-top: 1px solid #ddd; padding-top: 5px; margin-top: 5px; }
    .item-box { border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; }
    .item-title { font-weight: bold; margin-bottom: 5px; }
    .item-detail { color: #555; font-size: 12px; margin: 2px 0; }
    .item-price { font-weight: bold; margin-top: 10px; }
    .footer { text-align: center; color: #888; font-size: 11px; margin-top: 40px; }
  </style>
</head>
<body>
  <h1>Order Summary</h1>
  <div class="order-info">Order placed ${orderDate} &nbsp;&nbsp;&nbsp; Order # ${order.order_number}</div>

  <div class="details-box">
    <div>
      <div class="section-title">Ship to</div>
      <div>${escapeHtml(recipient.name)}</div>
      ${recipient.lines.map(line => `<div>${escapeHtml(line)}</div>`).join('\n      ')}
    </div>
    <div>
      <div class="section-title">Payment method</div>
      <div>${escapeHtml(paymentMethod)}</div>
    </div>
    <div>
      <div class="section-title">Order Summary</div>
      ${summaryRows}
    </div>
  </div>

  ${itemsHtml}

  <div class="footer">
    Conditions of Use | Privacy Notice | Consumer Health Data Privacy Disclosure<br>
    &copy; 1996-2025, Amazon.com, Inc. or its affiliates
  </div>
</body>
</html>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate PDF from order data
 */
async function generateOrderPdf(order, outputPath) {
  const html = generateOrderHtml(order);

  // Write HTML to temp file
  const htmlPath = outputPath.replace('.pdf', '.html');
  fs.writeFileSync(htmlPath, html);

  // Convert to PDF using Puppeteer
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: outputPath,
    format: 'A4',
    margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    printBackground: true
  });
  await browser.close();

  // Clean up HTML file
  fs.unlinkSync(htmlPath);

  return outputPath;
}

/**
 * Generate PDFs for multiple orders
 */
async function generateOrderPdfs(orders, outputDir = '/tmp') {
  const results = [];

  for (const order of orders) {
    if (!order.order_number || !order.grand_total) {
      console.log(`Skipping order without number or total`);
      continue;
    }

    const outputPath = path.join(outputDir, `amazon-order-${order.order_number}.pdf`);

    try {
      await generateOrderPdf(order, outputPath);
      results.push({ order_number: order.order_number, path: outputPath, success: true });
      console.log(`Generated: ${outputPath}`);
    } catch (error) {
      results.push({ order_number: order.order_number, error: error.message, success: false });
      console.error(`Failed to generate PDF for ${order.order_number}: ${error.message}`);
    }
  }

  return results;
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node amazon-order-to-pdf.cjs <order-json-file> [output-dir]');
    console.log('       node amazon-order-to-pdf.cjs --stdin [output-dir]');
    process.exit(1);
  }

  const outputDir = args[1] || '/tmp';

  (async () => {
    let orders;

    if (args[0] === '--stdin') {
      // Read from stdin
      const chunks = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      orders = JSON.parse(Buffer.concat(chunks).toString());
    } else {
      // Read from file
      const data = fs.readFileSync(args[0], 'utf8');
      orders = JSON.parse(data);
    }

    // Handle single order or array
    if (!Array.isArray(orders)) {
      orders = [orders];
    }

    const results = await generateOrderPdfs(orders, outputDir);
    console.log('\nResults:', JSON.stringify(results, null, 2));
  })();
}

module.exports = { generateOrderHtml, generateOrderPdf, generateOrderPdfs };
