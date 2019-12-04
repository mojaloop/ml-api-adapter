/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Gates Foundation

 * Juan Correa <juan.correa@modusbox.com>

 --------------
 ******/

'use strict'

const Test = require('tape')
const Base = require('../../base')
const Endpoints = require('@mojaloop/central-services-shared').Util.Endpoints
const Config = require('../../../../src/lib/config.js')

Test('return error if required fields are missing on prepare', async function (assert) {
  const req = Base.buildRequest({ url: '/endpointcache', method: 'DELETE', payload: {}, headers: { date: 'Mon, 28 Oct 2019 20:22:01 GMT' } })
  const server = await Base.setup()
  await Endpoints.initializeCache(Config.ENDPOINT_CACHE_CONFIG)
  const res = await server.inject(req)
  await server.stop()
  assert.equal(202, res.statusCode)
  assert.end()
})
