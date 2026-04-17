'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Rewire = require('rewire')
const Proxyquire = require('proxyquire')
const Hapi = require('@hapi/hapi')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { Jws } = require('@mojaloop/sdk-standard-components')
const JwsSigner = Jws.signer

const PluginsModule = Rewire('../../../src/shared/plugins')
const loadJwsKeys = PluginsModule.__get__('loadJwsKeys')
const watchJwsKeys = PluginsModule.__get__('watchJwsKeys')

const FSPIOP_SOURCE = 'payerfsp'

const generateKeyPair = () => crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
})

const buildSignedHeaders = ({ signingKey, method, urlPath, body, source = FSPIOP_SOURCE }) => {
  const signer = new JwsSigner({ signingKey })
  const reqOpts = {
    headers: {
      'content-type': 'application/vnd.interoperability.transfers+json;version=1.1',
      accept: 'application/vnd.interoperability.transfers+json;version=1',
      date: new Date().toUTCString(),
      'fspiop-source': source,
      'fspiop-destination': 'payeefsp'
    },
    method,
    uri: `http://switch${urlPath}`,
    body
  }
  signer.sign(reqOpts)
  return reqOpts.headers
}

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'jws-test-'))

Test('plugins - loadJwsKeys', (t) => {
  t.test('returns empty for missing dir', (assert) => {
    assert.deepEqual(loadJwsKeys('/no/such/path'), {})
    assert.end()
  })

  t.test('returns empty for undefined dir', (assert) => {
    assert.deepEqual(loadJwsKeys(undefined), {})
    assert.end()
  })

  t.test('reads .pem files and ignores others', (assert) => {
    const dir = makeTempDir()
    fs.writeFileSync(path.join(dir, 'fsp1.pem'), 'KEY-A')
    fs.writeFileSync(path.join(dir, 'fsp2.pem'), 'KEY-B')
    fs.writeFileSync(path.join(dir, 'readme.txt'), 'not a key')

    const keys = loadJwsKeys(dir)
    assert.is(keys.fsp1.toString(), 'KEY-A')
    assert.is(keys.fsp2.toString(), 'KEY-B')
    assert.notOk(keys.readme)

    fs.rmSync(dir, { recursive: true, force: true })
    assert.end()
  })

  t.end()
})

Test('plugins - watchJwsKeys', (t) => {
  t.test('returns null for missing dir', (assert) => {
    assert.is(watchJwsKeys('/no/such/path', {}), null)
    assert.end()
  })

  t.test('returns null for undefined dir', (assert) => {
    assert.is(watchJwsKeys(undefined, {}), null)
    assert.end()
  })

  t.test('detects added key', async (assert) => {
    const dir = makeTempDir()
    const keyMap = {}
    const watcher = watchJwsKeys(dir, keyMap)

    fs.writeFileSync(path.join(dir, 'newfsp.pem'), 'NEW-KEY')
    const deadline = Date.now() + 3000
    while (!keyMap.newfsp && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 25))
    }
    assert.ok(keyMap.newfsp, 'key was loaded')

    watcher.close()
    fs.rmSync(dir, { recursive: true, force: true })
    assert.end()
  })

  t.test('detects removed key', async (assert) => {
    const dir = makeTempDir()
    fs.writeFileSync(path.join(dir, 'old.pem'), 'OLD')
    const keyMap = { old: Buffer.from('OLD') }
    const watcher = watchJwsKeys(dir, keyMap)

    fs.rmSync(path.join(dir, 'old.pem'))
    const deadline = Date.now() + 3000
    while (keyMap.old && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 25))
    }
    assert.notOk(keyMap.old, 'key was removed')

    watcher.close()
    fs.rmSync(dir, { recursive: true, force: true })
    assert.end()
  })

  t.test('ignores non-pem files', async (assert) => {
    const dir = makeTempDir()
    const keyMap = {}
    const watcher = watchJwsKeys(dir, keyMap)

    fs.writeFileSync(path.join(dir, 'notes.txt'), 'hi')
    await new Promise(resolve => setTimeout(resolve, 200))
    assert.deepEqual(keyMap, {}, 'no key loaded')

    watcher.close()
    fs.rmSync(dir, { recursive: true, force: true })
    assert.end()
  })

  t.end()
})

Test('plugins - registerPlugins with JWS_VALIDATE', (t) => {
  let sandbox

  t.beforeEach((assert) => {
    sandbox = Sinon.createSandbox()
    assert.end()
  })

  t.afterEach((assert) => {
    sandbox.restore()
    assert.end()
  })

  const { privateKey, publicKey } = generateKeyPair()

  const stub = (n) => ({ plugin: { name: n, register: () => {} } })
  const CSSHapi = require('@mojaloop/central-services-shared').Util.Hapi

  const loadModule = (jwsValidate, keysDir) => {
    return Proxyquire('../../../src/shared/plugins', {
      '../lib/config': {
        API_TYPE: 'fspiop',
        PROTOCOL_VERSIONS: {
          CONTENT: { VALIDATELIST: ['1.1'] },
          ACCEPT: { VALIDATELIST: ['1'] }
        },
        JWS_VALIDATE: jwsValidate,
        JWS_VERIFICATION_KEYS_DIRECTORY: keysDir,
        JWS_VALIDATE_PUT_PARTIES: false
      },
      'hapi-swagger': stub('stub-swagger'),
      '@hapi/good': stub('stub-good'),
      '@hapi/basic': stub('stub-basic'),
      '@now-ims/hapi-now-auth': stub('stub-now-auth'),
      'hapi-auth-bearer-token': stub('stub-bearer'),
      '@mojaloop/central-services-shared': {
        Util: {
          Hapi: {
            ...CSSHapi,
            OpenapiBackendValidator: stub('stub-openapi-validator'),
            FSPIOPHeaderValidation: { plugin: stub('stub-header-validation') }
          }
        },
        '@global': true
      }
    })
  }

  const createServer = async (pluginsModule) => {
    const server = new Hapi.Server({
      routes: { payload: { output: 'stream', parse: true } }
    })

    const fakeBackend = { matchOperation: () => ({}) }
    await pluginsModule.registerPlugins(server, fakeBackend)

    server.ext('onPreResponse', (req, h) => {
      if (req.response && req.response.name === 'FSPIOPError') {
        const { apiErrorCode } = req.response
        return h.response({ errorCode: apiErrorCode.code }).code(apiErrorCode.httpStatusCode)
      }
      return h.continue
    })

    const ok = (_req, h) => h.response({ ok: true }).code(200)
    server.route([
      { method: 'POST', path: '/transfers', handler: ok },
      { method: 'PUT', path: '/transfers/{id}', handler: ok },
      { method: 'GET', path: '/transfers/{id}', handler: ok },
      { method: 'POST', path: '/quotes', handler: ok }
    ])
    return server
  }

  const fspiopHeaders = (extra = {}) => ({
    accept: 'application/vnd.interoperability.transfers+json;version=1.1',
    'content-type': 'application/vnd.interoperability.transfers+json;version=1.1',
    date: new Date().toUTCString(),
    'fspiop-source': FSPIOP_SOURCE,
    'fspiop-destination': 'payeefsp',
    ...extra
  })

  t.test('JWS_VALIDATE=false does not register validation', async (assert) => {
    const mod = loadModule(false, undefined)
    const server = await createServer(mod)
    const res = await server.inject({
      method: 'POST',
      url: '/transfers',
      headers: fspiopHeaders(),
      payload: { transferId: 'abc' }
    })
    assert.is(res.statusCode, 200, 'no validation when disabled')
    assert.end()
  })

  t.test('JWS_VALIDATE=true rejects unsigned request', async (assert) => {
    const dir = makeTempDir()
    fs.writeFileSync(path.join(dir, `${FSPIOP_SOURCE}.pem`), publicKey)
    const mod = loadModule(true, dir)
    const server = await createServer(mod)

    const res = await server.inject({
      method: 'POST',
      url: '/transfers',
      headers: fspiopHeaders(),
      payload: { transferId: 'abc' }
    })
    assert.is(res.statusCode, 400)
    assert.is(JSON.parse(res.payload).errorCode, '3105')

    if (server.app.jwsKeyWatcher) server.app.jwsKeyWatcher.close()
    fs.rmSync(dir, { recursive: true, force: true })
    assert.end()
  })

  t.test('JWS_VALIDATE=true accepts valid signed request and cleanup on stop', async (assert) => {
    const dir = makeTempDir()
    fs.writeFileSync(path.join(dir, `${FSPIOP_SOURCE}.pem`), publicKey)
    const mod = loadModule(true, dir)
    const server = await createServer(mod)

    const body = { transferId: 'abc', amount: { currency: 'USD', amount: '10' } }
    const headers = buildSignedHeaders({ signingKey: privateKey, method: 'POST', urlPath: '/transfers', body })
    const res = await server.inject({ method: 'POST', url: '/transfers', headers, payload: body })
    assert.is(res.statusCode, 200)

    await server.stop()
    fs.rmSync(dir, { recursive: true, force: true })
    assert.end()
  })

  t.test('GET bypasses JWS validation', async (assert) => {
    const dir = makeTempDir()
    fs.writeFileSync(path.join(dir, `${FSPIOP_SOURCE}.pem`), publicKey)
    const mod = loadModule(true, dir)
    const server = await createServer(mod)

    const res = await server.inject({
      method: 'GET',
      url: '/transfers/abc',
      headers: fspiopHeaders()
    })
    assert.is(res.statusCode, 200)

    if (server.app.jwsKeyWatcher) server.app.jwsKeyWatcher.close()
    fs.rmSync(dir, { recursive: true, force: true })
    assert.end()
  })

  t.test('non-transfer resource bypasses JWS validation', async (assert) => {
    const dir = makeTempDir()
    fs.writeFileSync(path.join(dir, `${FSPIOP_SOURCE}.pem`), publicKey)
    const mod = loadModule(true, dir)
    const server = await createServer(mod)

    const res = await server.inject({
      method: 'POST',
      url: '/quotes',
      headers: fspiopHeaders(),
      payload: { quoteId: 'xyz' }
    })
    assert.is(res.statusCode, 200)

    if (server.app.jwsKeyWatcher) server.app.jwsKeyWatcher.close()
    fs.rmSync(dir, { recursive: true, force: true })
    assert.end()
  })

  t.test('JWS_VALIDATE=true with missing keys dir still registers', async (assert) => {
    const mod = loadModule(true, '/no/such/dir')
    const server = await createServer(mod)

    const res = await server.inject({
      method: 'POST',
      url: '/transfers',
      headers: fspiopHeaders(),
      payload: { transferId: 'abc' }
    })
    assert.is(res.statusCode, 400, 'rejects because no keys are loaded')

    if (server.app.jwsKeyWatcher) server.app.jwsKeyWatcher.close()
    assert.end()
  })

  t.end()
})
