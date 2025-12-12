#!/usr/bin/env node
/**
 * Test script to verify Gmail and Xero authentication
 * Run with: node test-auth.js
 */

import { google } from 'googleapis';
import { XeroClient } from 'xero-node';
import { config } from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

config();

const GMAIL_CREDENTIALS_PATH = join(homedir(), '.gmail-mcp', 'gcp-oauth.keys.json');
const GMAIL_TOKEN_PATH = join(homedir(), '.gmail-mcp', 'credentials.json');
const XERO_TOKEN_PATH = '.xero-token.json';

async function testGmail() {
  console.log('\n📧 GMAIL TEST');
  console.log('─'.repeat(40));

  if (!existsSync(GMAIL_CREDENTIALS_PATH)) {
    console.log('❌ Credentials not found at:', GMAIL_CREDENTIALS_PATH);
    console.log('   Run: npx @gongrzhe/server-gmail-autoauth-mcp auth');
    return false;
  }
  console.log('✓ Credentials file exists');

  if (!existsSync(GMAIL_TOKEN_PATH)) {
    console.log('❌ Not authenticated. Run:');
    console.log('   npx @gongrzhe/server-gmail-autoauth-mcp auth');
    return false;
  }
  console.log('✓ Token file exists');

  try {
    const creds = JSON.parse(readFileSync(GMAIL_CREDENTIALS_PATH, 'utf8'));
    const tokens = JSON.parse(readFileSync(GMAIL_TOKEN_PATH, 'utf8'));
    const { client_id, client_secret } = creds.installed || creds.web;

    const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
    oauth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:starred',
      maxResults: 5
    });

    const count = res.data.messages?.length || 0;
    console.log(`✓ API connection working`);
    console.log(`✓ Found ${count} starred email(s)`);
    return true;
  } catch (error) {
    console.log('❌ API Error:', error.message);
    if (error.message.includes('invalid_grant')) {
      console.log('   Token expired. Re-run: npx @gongrzhe/server-gmail-autoauth-mcp auth');
    }
    return false;
  }
}

async function testXero() {
  console.log('\n📊 XERO TEST');
  console.log('─'.repeat(40));

  if (!process.env.XERO_CLIENT_ID) {
    console.log('❌ XERO_CLIENT_ID not set in .env');
    return false;
  }
  console.log('✓ Client ID configured');

  if (!process.env.XERO_CLIENT_SECRET) {
    console.log('❌ XERO_CLIENT_SECRET not set in .env');
    return false;
  }
  console.log('✓ Client Secret configured');

  if (!process.env.XERO_REDIRECT_URI) {
    console.log('❌ XERO_REDIRECT_URI not set in .env');
    return false;
  }
  console.log('✓ Redirect URI:', process.env.XERO_REDIRECT_URI);

  const xero = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID,
    clientSecret: process.env.XERO_CLIENT_SECRET,
    redirectUris: [process.env.XERO_REDIRECT_URI],
    scopes: ['openid', 'profile', 'accounting.transactions', 'accounting.settings.read'],
  });

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
    console.log('  First use will open browser for OAuth');
    console.log('  Make sure ngrok is running!');

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
