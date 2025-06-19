const { readFile, writeFile } = require('node:fs/promises')
const { join } = require('node:path')
const emailvalidDomains = require('emailvalid/domains.json')
const { reasonableEmail } = require('./reasonable-email.js')

/** @type {Set<string>} */
const disposableEmailDomains = new Set()
/** @type {Set<string>} */
const wildcardDomains = new Set()

const disposableEmailDomainsPath = join(__dirname, 'disposable-email-domains', 'disposable_email_blocklist.conf')
const allowList = join(__dirname, 'disposable-email-domains', 'allowlist.conf')

/**
 * Checks if a domain is a wildcard pattern (ends with .*)
 *
 * @param {string} domain - The domain to check
 * @returns {boolean} - Whether the domain is a wildcard pattern
 */
function isWildcardDomain (domain) {
  return domain.endsWith('.*')
}

/**
 * Extracts the base domain from a wildcard pattern (removes the .*)
 *
 * @param {string} wildcardDomain - The wildcard domain pattern (e.g., "example.*")
 * @returns {string} - The base domain (e.g., "example")
 */
function getBaseDomain (wildcardDomain) {
  // @ts-expect-error
  return wildcardDomain.split('.*')[0] // Remove ".*"
}

/**
 * Checks if a domain would pass the reasonableEmail regex validation.
 *
 * @param {string} domain - The domain to check
 * @returns {boolean} - Whether the domain would create a valid email address
 */
function isReasonableDomain (domain) {
  // Skip checking wildcard domains with reasonableEmail
  if (isWildcardDomain(domain)) return true

  // Create a test email with the domain to check against the regex
  const testEmail = `test@${domain}`
  return reasonableEmail.test(testEmail)
}

/**
 * Main function that builds the disposable email domain list.
 *
 * @returns {Promise<void>}
 */
const work = async () => {
  console.log('Adding disposable-email-domains')
  const disposableEmailDomainsRaw = await readFile(disposableEmailDomainsPath, { encoding: 'utf-8' })
  /** @type {string[]} */
  const disposableEmailDomainsList = disposableEmailDomainsRaw.split('\n').slice(0, -1)
  /** @type {number} */
  let skippedCount = 0
  for (const domain of disposableEmailDomainsList) {
    if (isWildcardDomain(domain)) {
      wildcardDomains.add(getBaseDomain(domain))
    } else if (isReasonableDomain(domain)) {
      disposableEmailDomains.add(domain)
    } else {
      skippedCount++
    }
  }
  console.log(`Skipped ${skippedCount} domains from disposable-email-domains that don't pass the reasonableEmail regex`)

  console.log('Adding emailvalid')
  /** @type {string[]} */
  const disposableOnly = Object.entries(emailvalidDomains).filter(([_domain, type]) => type === 'disposable').map(([domain, _type]) => domain)

  /** @type {number} */
  let skippedEmailvalidCount = 0
  for (const domain of disposableOnly) {
    if (isWildcardDomain(domain)) {
      wildcardDomains.add(getBaseDomain(domain))
    } else if (isReasonableDomain(domain)) {
      disposableEmailDomains.add(domain)
    } else {
      skippedEmailvalidCount++
    }
  }
  console.log(`Skipped ${skippedEmailvalidCount} domains from emailvalid that don't pass the reasonableEmail regex`)

  console.log('Removing anything in disposable-email-domains/allowlist.conf')
  // I guess newlines are a format too
  const allowDataRaw = await readFile(allowList, { encoding: 'utf-8' })
  const allowData = allowDataRaw.split('\n').slice(0, -1)
  for (const domain of allowData) {
    disposableEmailDomains.delete(domain)
    wildcardDomains.delete(getBaseDomain(domain))
  }

  /** @type {string[]} */
  const denyListOverride = require('./deny-list.json')
  /** @type {number} */
  let skippedDenylistCount = 0
  denyListOverride.forEach(domain => {
    if (isWildcardDomain(domain)) {
      wildcardDomains.add(getBaseDomain(domain))
    } else if (isReasonableDomain(domain)) {
      disposableEmailDomains.add(domain)
    } else {
      skippedDenylistCount++
    }
  })
  console.log(`Skipped ${skippedDenylistCount} domains from deny-list that don't pass the reasonableEmail regex`)

  /** @type {string[]} */
  const allowListOverride = require('./allow-list.json')
  allowListOverride.forEach(domain => {
    disposableEmailDomains.delete(domain)
    wildcardDomains.delete(getBaseDomain(domain))
  })

  /** @type {number} */
  const finalCount = disposableEmailDomains.size
  /** @type {number} */
  const wildcardCount = wildcardDomains.size

  // Sort the domains for consistency
  const sortedDisposable = Array.from(disposableEmailDomains).sort()
  const sortedWildcards = Array.from(wildcardDomains).sort()

  // Create the disposable.json file (regular domains)
  await writeFile('disposable.json', JSON.stringify(sortedDisposable, null, ' '))

  // Create the wildcard-disposable.json file (base domains without the .*)
  await writeFile('wildcard-disposable.json', JSON.stringify(sortedWildcards, null, ' '))

  console.log(`Done! Final disposable domain list contains ${finalCount} domains and ${wildcardCount} wildcard base domains`)
}

work().catch(err => {
  console.error(err)
  process.exit(1)
})
