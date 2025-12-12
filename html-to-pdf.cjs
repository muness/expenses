#!/usr/bin/env node
/**
 * HTML to PDF Converter
 *
 * Converts HTML files to PDF using Puppeteer (headless Chrome).
 * Useful for converting email receipts to PDF format for tax records.
 *
 * Usage:
 *   node html-to-pdf.cjs <input.html> [output.pdf]
 *
 * If output path is not specified, uses input filename with .pdf extension.
 *
 * Examples:
 *   node html-to-pdf.cjs /tmp/receipt.html
 *   node html-to-pdf.cjs /tmp/receipt.html /tmp/receipt.pdf
 */

const puppeteer = require('puppeteer');
const path = require('path');

async function htmlToPdf(inputPath, outputPath) {
  // Resolve paths
  const inputFile = path.resolve(inputPath);
  const outputFile = outputPath
    ? path.resolve(outputPath)
    : inputFile.replace(/\.html?$/i, '.pdf');

  console.log(`Converting: ${inputFile}`);
  console.log(`Output: ${outputFile}`);

  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    await page.goto(`file://${inputFile}`, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputFile,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
    console.log(`PDF created: ${outputFile}`);
    return outputFile;
  } finally {
    await browser.close();
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node html-to-pdf.cjs <input.html> [output.pdf]');
    process.exit(1);
  }

  const [input, output] = args;

  htmlToPdf(input, output)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}

module.exports = { htmlToPdf };
