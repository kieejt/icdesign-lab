import assert from 'node:assert/strict'
import { test } from 'node:test'

import { displayName, generatePassword, normalizeEmail, passwordProblem } from '../utils/passwords.js'

test('generated passwords are long, unambiguous and different each time', () => {
  const seen = new Set()
  for (let i = 0; i < 200; i += 1) {
    const password = generatePassword()
    assert.equal(password.length, 14)
    assert.match(password, /^[A-HJ-NP-Za-km-z2-9]+$/) // no 0 O 1 l I
    seen.add(password)
  }
  assert.equal(seen.size, 200)
})

test('passwordProblem enforces the length limits', () => {
  assert.ok(passwordProblem('short'))
  assert.ok(passwordProblem(undefined))
  assert.ok(passwordProblem('x'.repeat(129)))
  assert.equal(passwordProblem('a-long-enough-passphrase'), null)
})

test('normalizeEmail lower-cases and rejects non-addresses', () => {
  assert.equal(normalizeEmail('  Student@HUST.edu.vn '), 'student@hust.edu.vn')
  for (const bad of ['', 'no-at-sign', 'a@b', 'a b@c.d', null, { $gt: '' }, 42]) assert.equal(normalizeEmail(bad), null)
})

test('a discussion shows the name, or the e-mail without its domain', () => {
  assert.equal(displayName({ name: 'Nguyen Van A', email: 'a@hust.edu.vn' }), 'Nguyen Van A')
  assert.equal(displayName({ name: '', email: 'a.nguyen@hust.edu.vn' }), 'a.nguyen')
})
