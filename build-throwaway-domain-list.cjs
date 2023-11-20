const { readFile, writeFile } = require('node:fs/promises')
const { join } = require('node:path')
const emailvalidDomains = require('emailvalid/domains.json')

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
  const disposableOnly = Object.entries(emailvalidDomains).filter(([domain, type]) => type === 'disposable').map(([domain, type]) => domain)

  for (const domain of disposableOnly) {
    disposableEmailDomains.add(domain)
  }

  console.log('Removing anything in allowlist')
  const allowDataRaw = await readFile(allowList, { encoding: 'utf-8' })
  const allowData = allowDataRaw.split('\n').slice(0, -1)
  for (const domain of allowData) {
    disposableEmailDomains.delete(domain)
  }

  console.log('Add in any other random domains I dont want to register')
  const unwatedDomains = [
    'tmail.link'
  ]
  for (const unwantedDomain of unwatedDomains) {
    disposableEmailDomains.add(unwantedDomain)
  }

  await writeFile('disposable.json', JSON.stringify(Array.from(disposableEmailDomains).sort(), null, ' '))
  console.log('done')
}

work().catch(err => {
  console.error(err)
  process.exit(1)
})
