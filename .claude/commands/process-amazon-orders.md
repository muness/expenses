# Process Amazon Orders for Business Expenses

Review Amazon orders from the past month and create Xero receipts for business expenses WITH PDF attachments.

## Instructions

1. **Login to Amazon** first using `amazon_login` - ASK THE USER for their OTP code from their authenticator app

2. **Load status file** from `amazon-order-status.json` in the current directory (create if doesn't exist)

3. **Process in 3-day batches**, going back 30 days from today:
   - Use `amazon_get_order_history(time_filter="last30", full_details=true)`
   - Skip any orders already in the status file (by order_number)

4. **For each order**, score business expense confidence (0-100):

   **HIGH confidence (70+)** - Auto-process:
   - Computer/electronics (monitors, keyboards, cables, adapters)
   - Office supplies (paper, pens, desk accessories)
   - Software/subscriptions
   - Books (technical, business)
   - Cloud services, domains, hosting

   **LOW confidence (below 30)** - Auto-skip:
   - Food/groceries (unless clearly catering)
   - Clothing/personal items
   - Home goods, furniture (unless clearly office)
   - Entertainment, games, toys
   - Health/beauty products

   **UNCERTAIN (30-70)** - Ask user:
   - Present item name, price, and your reasoning
   - Ask: "Is this a business expense? (yes/no/skip)"

5. **For business expenses**:
   - Create receipt using `xero_create_receipt` with:
     - vendorName: "Amazon"
     - amount: item price (or order total if single item)
     - description: item title (truncated to 100 chars)
     - date: order_placed_date
     - accountCode: appropriate code (see below)
   - **Generate PDF invoice** using `amazon-order-to-pdf.cjs` (see PDF Generation below)
   - **Attach PDF to receipt** using `xero_attach_file_to_receipt`
   - Update status file: `status: processed`, `receiptId: <id>`, `pdfPath: <path>`

6. **For non-business items**:
   - Update status file: `status: skipped`, `reason: <brief reason>`

7. **After all orders processed**:
   - Show summary table (order_number, item, amount, status, attachment)
   - Report totals: processed count, skipped count, total business expense amount

## PDF Generation (REQUIRED)

Every business expense receipt MUST have a PDF attachment. Use the `amazon-order-to-pdf.cjs` tool to generate PDFs from order data.

### Method 1: Use the tool programmatically

```javascript
const { generateOrderPdf } = require('./amazon-order-to-pdf.cjs');

// Generate PDF from order object
const pdfPath = await generateOrderPdf(orderData, '/tmp/amazon-order-XXX.pdf');
```

### Method 2: Generate HTML manually and convert

1. Create HTML file at `/tmp/amazon-order-{order_number}.html` with this template:

```html
<!DOCTYPE html>
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
  <div class="order-info">Order placed {DATE} &nbsp;&nbsp;&nbsp; Order # {ORDER_NUMBER}</div>

  <div class="details-box">
    <div>
      <div class="section-title">Ship to</div>
      <div>{RECIPIENT_NAME}</div>
      <div>{ADDRESS_LINE_1}</div>
      <div>{ADDRESS_LINE_2}</div>
    </div>
    <div>
      <div class="section-title">Payment method</div>
      <div>{PAYMENT_METHOD} ending in {LAST_4}</div>
    </div>
    <div>
      <div class="section-title">Order Summary</div>
      <div class="summary-row"><span>Item(s) Subtotal:</span><span>${SUBTOTAL}</span></div>
      <div class="summary-row"><span>Shipping & Handling:</span><span>${SHIPPING}</span></div>
      <!-- Include coupon_savings, subscription_discount if present -->
      <div class="summary-row"><span>Total before tax:</span><span>${TOTAL_BEFORE_TAX}</span></div>
      <div class="summary-row"><span>Estimated tax:</span><span>${TAX}</span></div>
      <div class="summary-row total"><span>Grand Total:</span><span>${GRAND_TOTAL}</span></div>
    </div>
  </div>

  <!-- Repeat for each item -->
  <div class="item-box">
    <div class="item-title">{ITEM_TITLE}</div>
    <div class="item-detail">Sold by: {SELLER}</div>
    <div class="item-price">${ITEM_PRICE}</div>
  </div>

  <div class="footer">
    Conditions of Use | Privacy Notice | Consumer Health Data Privacy Disclosure<br>
    &copy; 1996-2025, Amazon.com, Inc. or its affiliates
  </div>
</body>
</html>
```

2. Convert to PDF using `html-to-pdf.cjs`:
```bash
node html-to-pdf.cjs /tmp/amazon-order-{order_number}.html /tmp/amazon-order-{order_number}.pdf
```

3. Attach to receipt:
```
xero_attach_file_to_receipt(receiptId, "/tmp/amazon-order-{order_number}.pdf")
```

## Status File Format (amazon-order-status.json)

```json
{
  "orders": {
    "111-1234567-1234567": {
      "item": "USB-C Hub Adapter",
      "amount": "$29.99",
      "date": "2024-12-01",
      "status": "processed",
      "confidence": 85,
      "receiptId": "abc-123",
      "pdfPath": "/tmp/amazon-order-111-1234567-1234567.pdf",
      "reason": "Office equipment"
    },
    "111-9876543-9876543": {
      "item": "Kitchen Towels",
      "amount": "$15.99",
      "date": "2024-12-02",
      "status": "skipped",
      "confidence": 10,
      "reason": "Personal/household item"
    }
  }
}
```

## Account Codes

- 651: Computer & Electronic Expense (cables, adapters, hardware)
- 652: Office Expenses (supplies, desk items)
- 677: eBooks, books, magazine subscriptions
- 678: Software and licenses
- 684: Travel (luggage, travel accessories)

## Notes

- Get Xero userId by calling `xero_list_users` (cache it for the session)
- For multi-item orders, evaluate each item separately if prices differ significantly
- If order has mixed business/personal items, only expense the business items
- Be conservative - when in doubt, ask rather than auto-process
- Save status file after each order (not at the end) to preserve progress
- **ALWAYS generate and attach PDFs** - receipts without attachments are incomplete!
