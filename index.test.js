/**
 * @import {TestContext} from 'node:test'
 */

import test from 'node:test'
import assert from 'node:assert'
import { resolveEmail } from './index.js'

const inputs = [
  {
    in: 'bcomnes@gmail.com',
    expect: true,
  },
  {
    in: 'bcomnes@gmailc.om',
    expect: false,
  },
  {
    in: 'afastmail@fastmail.com',
    expect: true,
  },
  {
    in: 'fofegoj914@naymedia.com',
    expect: false,
  },
  {
    in: 'test@rocketmail.com',
    expect: true,
  },
  {
    in: 'example@Cock.li',
    expect: false,
  },
  // Test wildcard domain patterns
  {
    in: 'test@spambog.com',
    expect: false,
    description: 'should match wildcard pattern spambog.*'
  },
  {
    in: 'test@spambog.net',
    expect: false,
    description: 'should match wildcard pattern spambog.*'
  },
  {
    in: 'test@discardmail.org',
    expect: false,
    description: 'should match wildcard pattern discardmail.*'
  },
  {
    in: 'test@mailcatch.xyz',
    expect: false,
    description: 'should match wildcard pattern mailcatch.*'
  }
]

for (const i of inputs) {
  const testName = i.description
    ? `${i.in} ${i.expect ? 'resolves' : 'does not resolve'} (${i.description})`
    : `${i.in} ${i.expect ? 'resolves' : 'does not resolve'}`

  test(testName, async (/** @type {TestContext} */ _t) => {
    const results = await resolveEmail(i.in)

    assert.strictEqual(
      results.emailResolves,
      i.expect,
      `${i.in} ${i.expect ? 'resolves' : 'does not resolve'}`
    )
  })
}
