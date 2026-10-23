import assert from 'node:assert/strict'
import { test } from 'node:test'

import { get, isPublicAddress } from '../services/scrapers/http.js'

test('private, loopback, link-local and metadata addresses are not public', () => {
  for (const address of [
    '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254',
    '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', '::', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:169.254.169.254',
  ]) {
    assert.equal(isPublicAddress(address), false, address)
  }
})

test('ordinary public addresses are allowed', () => {
  for (const address of ['8.8.8.8', '1.1.1.1', '172.32.0.1', '172.15.255.255', '2606:4700:4700::1111']) {
    assert.equal(isPublicAddress(address), true, address)
  }
})

test('the HTTP client refuses internal targets before connecting', async () => {
  delete process.env.ALLOW_PRIVATE_FETCH
  for (const url of ['http://169.254.169.254/latest/meta-data/', 'http://127.0.0.1:5000/api/health', 'http://[::1]/', 'file:///etc/passwd', 'ftp://example.com/x']) {
    await assert.rejects(get(url), (error) => error.code === 'EBLOCKED', url)
  }
})

test('a hostname that resolves to a loopback address is refused too', async () => {
  delete process.env.ALLOW_PRIVATE_FETCH
  await assert.rejects(get('http://localhost:5000/'), (error) => error.code === 'EBLOCKED' || error.code === 'ENOTFOUND')
})
