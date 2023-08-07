const { readFile, writeFile } = require('node:fs/promises')
const { join } = require('node:path')
const emailvalidDomains = require('emailvalid/domains.json')

const disposableEmailDomains = new Set()

const disposableEmailDomainsPath = join(__dirname, 'disposable-email-domains', 'disposable_email_blocklist.conf')

readFile(disposableEmailDomainsPath, { encoding: 'utf-8' })
  .then(async data => {
    const disposableEmailDomainsRaw = data
    const disposableEmailDomainsList = disposableEmailDomainsRaw.split('\n').slice(0, -1)
    for (const domain of disposableEmailDomainsList) {
      disposableEmailDomains.add(domain)
    }
  })
  .then(async () => {
    const disposableOnly = Object.entries(emailvalidDomains).filter(([domain, type]) => type === 'disposable').map(([domain, type]) => domain)

    for (const domain of disposableOnly) {
      disposableEmailDomains.add(domain)
    }
  })
  .then(async () => {
    return await writeFile('disposable.json', JSON.stringify(Array.from(disposableEmailDomains).sort(), null, ' '))
  })
  .then(async () => {
    console.log('done')
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
