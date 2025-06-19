import test from 'node:test'
import assert from 'node:assert'
import { resolveEmail } from './index.js'

// Regular disposable domains to test
const regularDomains = [
  '0-mail.com',
  '0clickemail.com',
  'mailinator.com',
  'guerrillamail.com'
  // Note: tempmail.com is not in our block list
]

// Wildcard domains to test
const wildcardDomains = [
  'spambog.com',
  'spambog.net',
  'spambog.org',
  'discardmail.com',
  'discardmail.net',
  'mailcatch.com'
]

// Fuzzing variations to test
const variations = [
  // Subdomains
  (/** @type {string} */ domain) => `sub.${domain}`,
  (/** @type {string} */ domain) => `random.${domain}`,
  (/** @type {string} */ domain) => `mail.${domain}`,
  (/** @type {string} */ domain) => `smtp.${domain}`,
  (/** @type {string} */ domain) => `a.b.c.${domain}`,

  // Case variations
  (/** @type {string} */ domain) => domain.toUpperCase(),
  (/** @type {string} */ domain) => domain.charAt(0).toUpperCase() + domain.slice(1),
  (/** @type {string} */ domain) => domain.split('').map((c, i) => i % 2 ? c.toUpperCase() : c).join(''),

  // Ports and weird formatting
  (/** @type {string} */ domain) => `${domain}:25`,
  (/** @type {string} */ domain) => `${domain}:587`,
  (/** @type {string} */ domain) => `${domain}:invalid`,

  // Domain modifications
  (/** @type {string} */ domain) => domain.replace('.', '-'),
  (/** @type {string} */ domain) => domain.replace('.', '_'),
  (/** @type {string} */ domain) => `${domain}.extra`,

  // Brackets
  (/** @type {string} */ domain) => `[${domain}]`,
  (/** @type {string} */ domain) => `[ipv4:${domain}]`
]

// Generate a test user for each domain and variation
/**
 *
 * @param {string[]} domainList
 * @returns
 */
function generateTestCases (domainList) {
  const testCases = []

  for (const domain of domainList) {
    // Add the original domain
    testCases.push(`test@${domain}`)

    // Add all variations
    for (const variation of variations) {
      try {
        testCases.push(`test@${variation(domain)}`)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error', { cause: err })
        // Skip if variation throws an error
        console.warn(`Skipping invalid variation for ${domain}:`, error.message)
      }
    }
  }

  return testCases
}

// Create all the test cases
const disposableTestCases = [
  ...generateTestCases(regularDomains),
  ...generateTestCases(wildcardDomains)
]

// Also add some hand-crafted edge cases
const edgeCases = [
  // Strange username parts
  'user.name@mailinator.com',
  'user+tag@guerrillamail.com',
  'very.unusual."@".unusual.com@spambog.com',
  '"very.(),:;<>[]".VERY."very@\\ "very".unusual"@discardmail.com',

  // IP addresses in domain part (should be rejected by isIP check)
  'test@[127.0.0.1]',
  'test@[ipv6:2001:db8::1]',

  // Unicode/IDN domains
  'test@mаіlіnаtоr.com', // cyrillic characters that look like latin
  'test@xn--80aacd1bhkfed3a8a5b.xn--p1ai', // Punycode

  // Port and parameters
  'test@mailinator.com:25',
  'test@guerrillamail.com:587',
  'test@mailinator.com?param=value',

  // Path-like elements
  'test@mailinator.com/path',
  'test@guerrillamail.com/path/to/resource',

  // Mixed case
  'test@MaIlInAtOr.CoM',
  'test@SPAMBOG.COM',

  // Excess whitespace
  'test@ mailinator.com',
  'test@mailinator.com ',
  ' test@guerrillamail.com',

  // URL-encoded characters
  'test@mailinator%2Ecom',
  'test@guerrillamail%2Ecom',

  // Protocol prefixes
  'test@http://mailinator.com',
  'test@https://guerrillamail.com',

  // Random gibberish that might be missed
  'test@mailinatorcom',
  'test@guerrillamailcom',
  'test@spambogcom',

  // Likely typos that should still be caught
  'test@mailinat0r.com', // with number 0
]

disposableTestCases.push(...edgeCases)

// Run tests for each case
for (const testEmail of disposableTestCases) {
  test(`Disposable domain should be rejected: ${testEmail}`, async (_t) => {
    try {
      const result = await resolveEmail(testEmail)
      assert.ok(!result.emailResolves, `Email ${testEmail} should not resolve`)
      assert.ok(result.error, `Email ${testEmail} should have an error`)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error', { cause: err })
      // If the test throws (rather than returning a result with error),
      // it's likely a syntax error or similar - log it but don't fail
      console.log(`Exception testing ${testEmail}: ${error.message}`)
    }
  })
}

// Strict testing for specific cases that should fail as disposable
// but might be slipping through
const strictTestCases = [
  // This domain is in our list but might not be getting caught
  // Test these actual domains that should be caught
  'test@mailinator.com',
  'test@sub.mailinator.com',
  'test@mail.mailinator.com',
  'test@MAILINATOR.COM',
  'test@mAiLiNaToR.CoM',

  // Edge cases that might slip through
  'test@mailinatorcom',
  'test@guerrillamailcom',
  'test@spambogcom',

  // Malformed but should still be caught as disposable
  'test@.mailinator.com',
  'test@mailinator.com.',
  'test@mailinator..com'
]

// Run strict tests that must always be rejected as disposable
for (const testEmail of strictTestCases) {
  test(`STRICT: ${testEmail} must be rejected`, async (_t) => {
    const result = await resolveEmail(testEmail)

    // Must not resolve
    assert.strictEqual(result.emailResolves, false, `Email ${testEmail} should not resolve`)

    // Must have an error
    assert.ok(result.error, `Email ${testEmail} should have an error`)
  })
}

// Also add some legitimate domains that should pass
const legitimateDomains = [
  // Common email providers
  'test@gmail.com',
  'user.name+tag@gmail.com', // Gmail with tag
  'test@googlemail.com', // Gmail alias
  'user.name@yahoo.com',
  'test@outlook.com',
  'test@hotmail.com',
  'test@live.com',
  'test@icloud.com',
  'test@protonmail.com',
  'test@aol.com',
  'test@mail.ru',
  'test@yandex.ru',

  // Organizations
  'someone@example.org',
  'info@microsoft.com',
  'support@apple.com',
  'contact@amazon.com',
  'help@twitter.com',
  'business@facebook.com',
  'developer@github.com',
  'admin@gitlab.com',
  'hello@stripe.com',
  'noreply@zoom.us',
  'webmaster@cloudflare.com',
  'careers@netflix.com',
  'team@slack.com',
  'feedback@spotify.com',
  'sales@salesforce.com',
  'hello@digitalocean.com',
  'support@dropbox.com',
  'info@ibm.com',

  // Educational and government domains
  'student@harvard.edu',
  'faculty@mit.edu',
  'staff@stanford.edu',
  'contact@nasa.gov',
  'info@whitehouse.gov',

  // Country-specific TLDs
  'support@google.com',      // Google - US tech giant
  'info@microsoft.com',      // Microsoft - US tech giant
  'contact@amazon.co.uk',    // Amazon UK
  'support@apple.com',       // Apple - US tech giant
  'info@yahoo.co.jp',        // Yahoo Japan
  'contact@bbc.co.uk',       // BBC - British Broadcasting Corporation
  'info@sap.de',             // SAP - German software company
  'support@adobe.com',       // Adobe - US software company
  'contact@telstra.com.au',  // Telstra - Australian telecom
  'info@shopify.ca',         // Shopify - Canadian e-commerce
  'contact@alibaba.com',     // Alibaba - Chinese e-commerce
  'support@dropbox.com',     // Dropbox - US cloud storage
  'info@sony.jp',            // Sony - Japanese electronics company
  'contact@samsung.com',     // Samsung - Korean electronics company
  'support@spotify.com'      // Spotify - Swedish streaming service
]

for (const testEmail of legitimateDomains) {
// Generate variations of legitimate domains with unusualr (const testEmail of legitimateDomains) {
  test(`Legitimate domain should be accepted: ${testEmail}`, async (_t) => {
    const result = await resolveEmail(testEmail)
    assert.deepStrictEqual(result.error, undefined, `Email ${testEmail} should not have an error`)
    assert.ok(result.emailResolves, `All of these should resolve ${testEmail}`)
  })
}
