import { isIP } from 'node:net'
import { resolveMx, resolve4, resolve6 } from 'node:dns/promises'
import { DatabaseSync } from 'node:sqlite'

/**
 * @typedef {Object} ResolveOptions
 * @property {boolean} [allowIps=true] Allow bare IPs as email addresses
 * @property {boolean} [allowDisposable=false] Allow disposable email addresses
 */

/**
 * @typedef {Object} ResolveResult
 * @property {boolean} emailResolves The email address has resolved and is not banned according to the allowable options.
 * @property {Array<{priority: number, exchange: string}>} [mxRecords] Any associated mx records from the lookup
 * @property {Error} [error] The error object if something didn't work
 */

let db

/**
 * Initialize the SQLite database connection.
 */
function initDatabase () {
  if (!db) {
    db = new DatabaseSync('./disposable.db')
  }
}

/**
 * Check if the domain is disposable by querying the SQLite database.
 *
 * @param {string} domain
 * @returns {boolean}
 */
function isDisposable (domain) {
  initDatabase()
  const query = db.prepare('SELECT 1 FROM disposable_domains WHERE domain = ?')
  const result = query.get(domain)
  return !!result
}

/**
 * Resolves MX records for the provided email domain.
 *
 * @param {string} email
 * @param {ResolveOptions?} [opts]
 * @returns {Promise<Array<{priority: number, exchange: string}>>}
 */
export async function _resolveMx (email, opts) {
  opts = {
    allowIps: false,
    allowDisposable: false,
    ...opts
  }
  const domain = (email.split('@').pop() || '').toLowerCase().trim().replace(/^\[(ipv6:)?|\]$/gi, '')

  if (isIP(domain)) {
    if (opts.allowIps) {
      return [{
        priority: 0,
        exchange: domain
      }]
    } else {
      throw new Error('An email address with an IP address for the domain is disallowed')
    }
  }

  if (isDisposable(domain) && !opts.allowDisposable) {
    throw new Error('Disposable email addresses are disallowed')
  }

  try {
    const resolved = await resolveMx(domain)
    return resolved.sort((a, b) => (a?.priority ?? 0) - (b?.priority ?? 0))
  } catch (err) {
    if (!['ENODATA', 'ENOTFOUND'].includes(err.code)) {
      throw err
    }

    try {
      return await ipFallback(domain, resolve4)
    } catch (err) {
      if (!['ENODATA', 'ENOTFOUND'].includes(err.code)) {
        throw err
      }
      return await ipFallback(domain, resolve6)
    }
  }
}

/**
 * Fallback to resolve A or AAAA records.
 *
 * @param {string} domain
 * @param {typeof resolve4 | typeof resolve6} resolver
 * @returns {Promise<Array<{priority: number, exchange: string}>>}
 */
async function ipFallback (domain, resolver) {
  const aList = await resolver(domain)

  // return the first resolved IP with priority 0
  return [...aList].map(entry => ({
    priority: 0,
    exchange: entry
  })).slice(0, 1)
}

/**
 * Resolves an email domain and returns the result.
 *
 * @param {string} domain
 * @param {ResolveOptions?} [opts]
 * @returns {Promise<ResolveResult>}
 */
export async function resolveEmail (domain, opts) {
  try {
    const entries = await _resolveMx(domain, opts)
    return {
      emailResolves: entries.length > 0,
      mxRecords: entries
    }
  } catch (err) {
    return {
      emailResolves: false,
      error: err
    }
  }
}
