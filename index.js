import { isIP } from 'node:net'
import { resolveMx, resolve4, resolve6 } from 'node:dns/promises'

export async function _resolveMx (email, opts) {
  opts = {
    allowIps: false,
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
      throw new Error('An email address with an IP address for the domain was is disallowed')
    }
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

async function ipFallback (domain, resolver) {
  const aList = await resolver(domain)

  // return the first resolved IP with priority 0
  return [...aList].map(entry => ({
    priority: 0,
    exchange: entry
  })).slice(0, 1)
}

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
