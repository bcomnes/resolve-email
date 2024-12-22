const { readFile, writeFile } = require('node:fs/promises')
const { join } = require('node:path')
const emailvalidDomains = require('emailvalid/domains.json')
const { DatabaseSync } = require('node:sqlite')

const disposableEmailDomains = new Set()

const disposableEmailDomainsPath = join(__dirname, 'disposable-email-domains', 'disposable_email_blocklist.conf')
const allowList = join(__dirname, 'disposable-email-domains', 'allowlist.conf')

const work = async () => {
  console.log('Adding disposable-email-domains')
  const disposableEmailDomainsRaw = await readFile(disposableEmailDomainsPath, { encoding: 'utf-8' })
  const disposableEmailDomainsList = disposableEmailDomainsRaw.split('\n').slice(0, -1)
  for (const domain of disposableEmailDomainsList) {
    disposableEmailDomains.add(domain)
  }

  console.log('Adding emailvalid')
  const disposableOnly = Object.entries(emailvalidDomains)
    .filter(([_domain, type]) => type === 'disposable')
    .map(([domain, _type]) => domain)

  for (const domain of disposableOnly) {
    disposableEmailDomains.add(domain)
  }

  console.log('Removing anything in disposable-email-domains/allowlist.conf')
  const allowDataRaw = await readFile(allowList, { encoding: 'utf-8' })
  const allowData = allowDataRaw.split('\n').slice(0, -1)
  for (const domain of allowData) {
    disposableEmailDomains.delete(domain)
  }

  const denyListOverride = require('./deny-list.json')
  denyListOverride.forEach(domain => {
    disposableEmailDomains.add(domain)
  })

  const allowListOverride = require('./allow-list.json')
  allowListOverride.forEach(domain => {
    disposableEmailDomains.delete(domain)
  })

  // Write disposable.json
  await writeFile('disposable.json', JSON.stringify(Array.from(disposableEmailDomains).sort(), null, ' '))
  console.log('Generated disposable.json')

  // Generate SQLite database
  console.log('Generating disposable.db')
  const db = new DatabaseSync('disposable.db')

  db.exec(`
    CREATE TABLE IF NOT EXISTS disposable_domains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT UNIQUE NOT NULL
    ) STRICT
  `)

  db.exec('DELETE FROM disposable_domains')

  const insert = db.prepare('INSERT OR IGNORE INTO disposable_domains (domain) VALUES (?)')
  for (const domain of disposableEmailDomains) {
    insert.run(domain)
  }

  insert.finalize()
  db.close()

  console.log('Generated disposable.db')
}

work().catch(err => {
  console.error(err)
  process.exit(1)
})
