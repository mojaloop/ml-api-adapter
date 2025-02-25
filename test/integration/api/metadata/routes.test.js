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

 * Lewis Daly <lewis@vesselstech.com>
 --------------
 **********/

'use strict'

const Test = require('tape')

const Logger = require('@mojaloop/central-services-logger')
const Kafka = require('@mojaloop/central-services-stream').Util
const Notification = require('../../../../src/handlers/notification')
const { registerAllHandlers } = require('../../../../src/handlers/register')
const metadataHandler = require('../../../../src/api/metadata/handler')
const NotificationHandler = require('../../../../src/handlers/notification/index')
const { initializeProducers } = require('../../../../src/shared/setup')

const {
  createRequest,
  sleep,
  unwrapResponse
} = require('../../../helpers/general')

Test('Metadata handler test', async handlerTest => {
  handlerTest.test('setup', async test => {
    await registerAllHandlers()

    // Give the handlers some time to be up
    const retries = Array.from({ length: 6 }, (x, i) => i).filter(i => i > 0).map(i => i * 2)
    const ready = await retries.reduce(async (acc, curr, next) => {
      const ready = await acc

      if (ready) {
        return Promise.resolve(true)
      }

      try {
        await Notification.isConnected()
        return Promise.resolve(true)
      } catch (err) {
        Logger.error(`Notification handler not ready yet. Sleeping for: ${curr} seconds.`)
      }

      return sleep(curr).then(() => false)
    }, Promise.resolve(false))

    if (!ready) {
      test.fail(`Notification handler not ready after ${retries.reduce((acc, curr) => acc + curr, 0)} seconds.`)
    }

    Logger.debug('Connected to Notification handler')

    test.end()
  })

  handlerTest.test('/health', async healthCheckTest => {
    healthCheckTest.test('get the health status', async test => {
      // Arrange
      const expectedStatus = 200
      const expectedServices = [
        { name: 'broker', status: 'OK' },
        { name: 'participantEndpointService', status: 'OK' }
      ]
      await initializeProducers()

      // Act
      const {
        responseBody,
        responseCode
      } = await unwrapResponse((reply) => metadataHandler.getHealth(createRequest({}), {}, reply))

      // Assert
      test.deepEqual(responseCode, expectedStatus, 'The response code matches')
      test.deepEqual(responseBody.services, expectedServices, 'The sub-services are correct')
      test.end()
    })
  })

  handlerTest.test('teardown', async test => {
    await NotificationHandler.disconnect()
    try {
      await Kafka.Producer.disconnect()
    } catch (err) { /* no-op */ }
    test.end()
  })

  handlerTest.end()
})
