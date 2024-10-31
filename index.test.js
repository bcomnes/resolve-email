/**
 * @import {TestContext} from 'node:test'
 */

import test from 'node:test'
import assert from 'node:assert'
import { resolveEmail } from './index.js'

const inputs = [
  {
    in: 'bcomnes@gmail.com',
    expect: true
  },
  {
    in: 'bcomnes@gmailc.om',
    expect: false
  },
  {
    in: 'afastmail@fastmail.com',
    expect: true
  },
  {
    in: 'fofegoj914@naymedia.com',
    expect: false
  },
  {
    in: 'test@rocketmail.com',
    expect: true
  }
]

for (const i of inputs) {
  test(`${i.in} ${i.expect ? 'resolves' : 'does not resolve'}`, async (/** @type {TestContext} */ _t) => {
    const results = await resolveEmail(i.in)

    assert.strictEqual(results.emailResolves, i.expect, `${i.in} ${i.expect ? 'resolves' : 'does not resolve'}`)
  })
}
