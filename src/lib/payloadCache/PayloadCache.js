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

const RedisCache = require('@mojaloop/central-services-shared/src/util/redis/redisCache')
const safeStringify = require('fast-safe-stringify')

const DEFAULT_TTL_SEC = 300 // pass through config
const KEY_PREFIX = 'iso_payload'

class PayloadCache extends RedisCache {
  async getPayload (requestId, parseJson = false) {
    try {
      const key = PayloadCache.formatPayloadCacheKey(requestId)
      const rawValue = await super.get(key)

      const value = (rawValue && parseJson)
        ? JSON.parse(rawValue)
        : rawValue

      this.log.debug('getPayload is done:', { key, requestId, value })
      return value
    } catch (err) {
      this.log.warn('getPayload is failed with error', err)
      return null
    }
  }

  async setPayload (requestId, payload, ttl = DEFAULT_TTL_SEC) {
    try {
      const key = PayloadCache.formatPayloadCacheKey(requestId)
      const valueString = typeof payload === 'string'
        ? payload
        : safeStringify(payload)
      const setResult = await super.set(key, valueString, ttl)

      this.log.debug('setPayload is done:', { key, requestId, setResult })
      return true
    } catch (err) {
      this.log.warn('setPayload is failed with error:', err)
      return false
    }
  }

  static formatPayloadCacheKey (requestId) {
    return `${KEY_PREFIX}:${requestId}`
  }
}

module.exports = PayloadCache
