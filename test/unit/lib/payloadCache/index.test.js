/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * Infitx
 - Vijay Kumar Guthi <vijaya.guthi@infitx.com>
 - Kevin Leyow <kevin.leyow@infitx.com>
 - Kalin Krustev <kalin.krustev@infitx.com>
 - Steven Oderayi <steven.oderayi@infitx.com>
 - Eugen Klymniuk <eugen.klymniuk@infitx.com>

 --------------

 ******/

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Proxyquire = require('proxyquire')
const { CACHE_TYPES } = require('../../../../src/lib/payloadCache/constants')
const RedisCacheStub = require('@mojaloop/central-services-shared/src/util/redis/redisCache')

Test('PayloadCache tests -->', payloadCacheTest => {
  const sandbox = Sinon.createSandbox()
  sandbox.stub(RedisCacheStub.prototype, 'set')
  sandbox.stub(RedisCacheStub.prototype, 'get')

  payloadCacheTest.beforeEach(test => {
    sandbox.reset()
    test.end()
  })

  payloadCacheTest.test('createPayloadCache should return a new PayloadCache instance for redis', async (t) => {
    const createPayloadCache = require('../../../../src/lib/payloadCache/createPayloadCache')
    const PayloadCache = require('../../../../src/lib/payloadCache/PayloadCache')
    const connectionConfig = { type: CACHE_TYPES.redis }
    const payloadCache = createPayloadCache(connectionConfig.type, connectionConfig)
    t.ok(payloadCache instanceof PayloadCache, 'PayloadCache instance created successfully')
    t.end()
  })

  payloadCacheTest.test('createPayloadCache should return a new PayloadCache instance for redisCluster', async (t) => {
    const createPayloadCache = require('../../../../src/lib/payloadCache/createPayloadCache')
    const PayloadCache = require('../../../../src/lib/payloadCache/PayloadCache')
    const connectionConfig = { type: CACHE_TYPES.redisCluster }
    const payloadCache = createPayloadCache(connectionConfig.type, connectionConfig)
    t.ok(payloadCache instanceof PayloadCache, 'PayloadCache instance created successfully')
    t.end()
  })

  payloadCacheTest.test('createPayloadCache should throw an error for unsupported cache type', async (t) => {
    const createPayloadCache = require('../../../../src/lib/payloadCache/createPayloadCache')
    const connectionConfig = { type: 'unsupported' }
    t.throws(() => createPayloadCache(connectionConfig.type, connectionConfig), 'Error thrown for unsupported cache type')
    t.end()
  })

  payloadCacheTest.test('PayloadCache should set and get a value', async (t) => {
    RedisCacheStub.prototype.set = sandbox.stub().returns('OK')
    RedisCacheStub.prototype.get = sandbox.stub().returns('testValue')

    const PayloadCacheProxy = Proxyquire('../../../../src/lib/payloadCache/PayloadCache', {
      '@mojaloop/central-services-shared/src/util/redis/redisCache': RedisCacheStub
    })
    const payloadCache = new PayloadCacheProxy({ type: CACHE_TYPES.redis })
    const requestId = 'testKey'
    const value = 'testValue'
    await payloadCache.setPayload(requestId, value)
    const cachedValue = await payloadCache.getPayload(requestId)
    t.equal(cachedValue, value, 'Value set and retrieved successfully')
    t.end()
  })

  payloadCacheTest.test('PayloadCache should return null for getPayload if key not found', async (t) => {
    RedisCacheStub.prototype.get = sandbox.stub().returns(null)

    const PayloadCacheProxy = Proxyquire('../../../../src/lib/payloadCache/PayloadCache', {
      '@mojaloop/central-services-shared/src/util/redis/redisCache': RedisCacheStub
    })
    const payloadCache = new PayloadCacheProxy({ type: CACHE_TYPES.redis })
    const requestId = 'testKey'
    const cachedValue = await payloadCache.getPayload(requestId)
    t.equal(cachedValue, null, 'Null returned for key not found')
    t.end()
  })

  payloadCacheTest.test('PayloadCache should parse value if parseJson param is set for getPayload', async (t) => {
    RedisCacheStub.prototype.get = sandbox.stub().returns('{"test": "testValue"}')

    const PayloadCacheProxy = Proxyquire('../../../../src/lib/payloadCache/PayloadCache', {
      '@mojaloop/central-services-shared/src/util/redis/redisCache': RedisCacheStub
    })
    const payloadCache = new PayloadCacheProxy({ type: CACHE_TYPES.redis })
    const requestId = 'testKey'
    const cachedValue = await payloadCache.getPayload(requestId, true)
    t.deepEqual(cachedValue, { test: 'testValue' }, 'Value parsed successfully')
    t.end()
  })

  payloadCacheTest.test('PayloadCache should return null for getPayload if error occurs', async (t) => {
    RedisCacheStub.prototype.get = sandbox.stub().throws(new Error('Test Error'))

    const PayloadCacheProxy = Proxyquire('../../../../src/lib/payloadCache/PayloadCache', {
      '@mojaloop/central-services-shared/src/util/redis/redisCache': RedisCacheStub
    })
    const payloadCache = new PayloadCacheProxy({ type: CACHE_TYPES.redis })
    const requestId = 'testKey'
    const cachedValue = await payloadCache.getPayload(requestId)
    t.equal(cachedValue, null, 'Null returned for error')
    t.end()
  })

  payloadCacheTest.test('PayloadCache should return false for setPayload if error occurs', async (t) => {
    RedisCacheStub.prototype.set = sandbox.stub().throws(new Error('Test Error'))

    const PayloadCacheProxy = Proxyquire('../../../../src/lib/payloadCache/PayloadCache', {
      '@mojaloop/central-services-shared/src/util/redis/redisCache': RedisCacheStub
    })
    const payloadCache = new PayloadCacheProxy({ type: CACHE_TYPES.redis })
    const requestId = 'testKey'
    const value = 'testValue'
    const setResult = await payloadCache.setPayload(requestId, value)
    t.equal(setResult, false, 'False returned for error')
    t.end()
  })

  payloadCacheTest.test('PayloadCache should stringify payload if not a string', async (t) => {
    RedisCacheStub.prototype.set = sandbox.stub().returns('OK')

    const PayloadCacheProxy = Proxyquire('../../../../src/lib/payloadCache/PayloadCache', {
      '@mojaloop/central-services-shared/src/util/redis/redisCache': RedisCacheStub
    })
    const payloadCache = new PayloadCacheProxy({ type: CACHE_TYPES.redis })
    const requestId = 'testKey'
    const value = { test: 'testValue' }
    await payloadCache.setPayload(requestId, value)
    t.ok(RedisCacheStub.prototype.set.calledWith(`iso_payload:${requestId}`, JSON.stringify(value), 300), 'Payload stringified before setting')
    t.end()
  })

  payloadCacheTest.end()
})
