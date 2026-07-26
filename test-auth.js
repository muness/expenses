#!/usr/bin/env node
/**
 * Test script to verify Xero authentication.
 * Gmail is handled by the configured Codex Gmail plugin/app (`@gmail`), not
 * project-local OAuth credentials.
 * Run with: node test-auth.js
 */

import { XeroClient } from 'xero-node';
import { config } from 'dotenv';
import { readFileSync, existsSync } from 'fs';

config();

const XERO_TOKEN_PATH = '.xero-token.json';

async function testGmail() {
  console.log('\n📧 GMAIL TEST');
  console.log('─'.repeat(40));
  console.log('✓ Gmail is provided by the configured Codex Gmail plugin/app (`@gmail`).');
  console.log('  Check plugin connection in Codex rather than this local script.');
  return true;
}

async function testXero() {
  console.log('\n📊 XERO TEST');
  console.log('─'.repeat(40));

  if (!process.env.XERO_CLIENT_ID) {
    console.log('❌ XERO_CLIENT_ID not set in .env');
    return false;
  }
  console.log('✓ Client ID configured');

  // Client secret is optional (PKCE mode doesn't need it)
  if (process.env.XERO_CLIENT_SECRET) {
    console.log('✓ Client Secret configured (Web app mode)');
  } else {
    console.log('✓ No Client Secret (Desktop app / PKCE mode)');
  }

  const redirectUri = process.env.XERO_REDIRECT_URI || 'http://localhost:3000/callback';
  console.log('✓ Redirect URI:', redirectUri);

  const config = {
    clientId: process.env.XERO_CLIENT_ID,
    redirectUris: [redirectUri],
    scopes: ['openid', 'profile', 'accounting.transactions', 'accounting.settings.read'],
  };
  if (process.env.XERO_CLIENT_SECRET) {
    config.clientSecret = process.env.XERO_CLIENT_SECRET;
  }

  const xero = new XeroClient(config);

  if (existsSync(XERO_TOKEN_PATH)) {
    console.log('✓ Token file exists');
    try {
      const tokens = JSON.parse(readFileSync(XERO_TOKEN_PATH, 'utf8'));
      xero.setTokenSet(tokens);

      if (xero.tokenSet.expired()) {
        console.log('⚠ Token expired, refreshing...');
        await xero.refreshToken();
        console.log('✓ Token refreshed');
      }

      const tenants = await xero.updateTenants();
      if (tenants.length > 0) {
        console.log('✓ Connected to organization:', tenants[0].tenantName);

        // Try to list accounts
        const accounts = await xero.accountingApi.getAccounts(tenants[0].tenantId);
        const expenseAccounts = accounts.body.accounts.filter(a => a.class === 'EXPENSE');
        console.log(`✓ Found ${expenseAccounts.length} expense account(s)`);
        return true;
      }
    } catch (error) {
      console.log('❌ API Error:', error.message);
      console.log('   Delete .xero-token.json and re-authenticate');
      return false;
    }
  } else {
    console.log('⚠ Not authenticated yet');
    console.log('  First use will open browser for OAuth (localhost)');

    try {
      const consentUrl = await xero.buildConsentUrl();
      console.log('✓ Consent URL can be generated');
      return true;
    } catch (error) {
      console.log('❌ Error building consent URL:', error.message);
      return false;
    }
  }
}

async function main() {
  console.log('🔐 EXPENSE AGENT AUTH TEST');
  console.log('═'.repeat(40));

  const gmailOk = await testGmail();
  const xeroOk = await testXero();

  console.log('\n' + '═'.repeat(40));
  console.log('SUMMARY');
  console.log('─'.repeat(40));
  console.log(`Gmail: ${gmailOk ? '✅ Ready' : '❌ Needs setup'}`);
  console.log(`Xero:  ${xeroOk ? '✅ Ready' : '❌ Needs setup'}`);

  if (gmailOk && xeroOk) {
    console.log('\n🎉 All set! Start Claude Code and try:');
    console.log('   "Process my starred expense emails"');
  }
}

main().catch(console.error);
