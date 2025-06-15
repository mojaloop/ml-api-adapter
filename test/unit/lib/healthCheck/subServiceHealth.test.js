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
 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>

 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const proxyquire = require('proxyquire')
const axios = require('axios')
const Producer = require('@mojaloop/central-services-stream').Util.Producer
const Config = require('../../../../src/lib/config')
const { statusEnum, serviceName } = require('@mojaloop/central-services-shared').HealthCheck.HealthCheckEnums
const Logger = require('@mojaloop/central-services-logger')

const Notification = require('../../../../src/handlers/notification/index')

Test('SubServiceHealth test', subServiceHealthTest => {
  let sandbox

  subServiceHealthTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Notification, 'isConnected')
    sandbox.stub(axios, 'get')

    sandbox.stub(Logger, 'isErrorEnabled').value(true)
    sandbox.stub(Logger, 'isInfoEnabled').value(true)
    sandbox.stub(Logger, 'isDebugEnabled').value(true)
    t.end()
  })

  subServiceHealthTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  subServiceHealthTest.test('getSubServiceHealthBroker', brokerTest => {
    brokerTest.test('returns OK when Notification is connected and Producer is connected', async test => {
      // Arrange
      Notification.isConnected.returns(true)
      const producerStub = sandbox.stub(Producer, 'allConnected').resolves(true)
      const subServiceHealthProxy = proxyquire('../../../../src/lib/healthCheck/subServiceHealth', {
        '../../handlers/notification': Notification,
        '@mojaloop/central-services-stream': { Util: { Producer } }
      })

      const expected = { name: serviceName.broker, status: statusEnum.OK }

      // Act
      const result = await subServiceHealthProxy.getSubServiceHealthBroker()

      // Assert
      test.ok(Notification.isConnected.calledOnce, 'Notification.isConnected should be called')
      test.ok(producerStub.calledOnce, 'Producer.allConnected should be called')
      test.deepEqual(result, expected, 'getSubServiceHealthBroker should return OK')
      test.end()
    })

    brokerTest.test('returns DOWN when Notification is not connected', async test => {
      // Arrange
      Notification.isConnected.returns(false)
      const producerStub = sandbox.stub(Producer, 'allConnected').resolves(true)
      const subServiceHealthProxy = proxyquire('../../../../src/lib/healthCheck/subServiceHealth', {
        '../../handlers/notification': Notification,
        '@mojaloop/central-services-stream': { Util: { Producer } }
      })

      const expected = { name: serviceName.broker, status: statusEnum.DOWN }

      // Act
      const result = await subServiceHealthProxy.getSubServiceHealthBroker()

      // Assert
      test.ok(Notification.isConnected.calledOnce, 'Notification.isConnected should be called')
      test.notOk(producerStub.called, 'Producer.allConnected should not be called if notification is not connected')
      test.deepEqual(result, expected, 'getSubServiceHealthBroker should return DOWN')
      test.end()
    })

    brokerTest.test('returns DOWN when Producer.allConnected throws', async test => {
      // Arrange
      Notification.isConnected.returns(true)
      const producerStub = sandbox.stub(Producer, 'allConnected').throws(new Error('Producer error'))
      const subServiceHealthProxy = proxyquire('../../../../src/lib/healthCheck/subServiceHealth', {
        '../../handlers/notification': Notification,
        '@mojaloop/central-services-stream': { Util: { Producer } }
      })

      const expected = { name: serviceName.broker, status: statusEnum.DOWN }

      // Act
      const result = await subServiceHealthProxy.getSubServiceHealthBroker()

      // Assert
      test.ok(Notification.isConnected.calledOnce, 'Notification.isConnected should be called')
      test.ok(producerStub.calledOnce, 'Producer.allConnected should be called')
      test.deepEqual(result, expected, 'getSubServiceHealthBroker should return DOWN')
      test.end()
    })

    brokerTest.test('returns OK when HANDLERS_DISABLED is true and Producer is connected', async test => {
      // Arrange
      const originalHandlersDisabled = Config.HANDLERS_DISABLED
      Config.HANDLERS_DISABLED = true
      Notification.isConnected.returns(false) // Should not matter
      const producerStub = sandbox.stub(Producer, 'allConnected').resolves(true)
      const subServiceHealthProxy = proxyquire('../../../../src/lib/healthCheck/subServiceHealth', {
        '../../handlers/notification': Notification,
        '@mojaloop/central-services-stream': { Util: { Producer } },
        '../../lib/config': Config
      })

      const expected = { name: serviceName.broker, status: statusEnum.OK }

      // Act
      const result = await subServiceHealthProxy.getSubServiceHealthBroker()

      // Assert
      test.notOk(Notification.isConnected.called, 'Notification.isConnected should not be called when HANDLERS_DISABLED')
      test.ok(producerStub.calledOnce, 'Producer.allConnected should be called')
      test.deepEqual(result, expected, 'getSubServiceHealthBroker should return OK')
      Config.HANDLERS_DISABLED = originalHandlersDisabled
      test.end()
    })

    brokerTest.test('returns DOWN when HANDLERS_DISABLED is true and Producer.allConnected throws', async test => {
      // Arrange
      const originalHandlersDisabled = Config.HANDLERS_DISABLED
      Config.HANDLERS_DISABLED = true
      Notification.isConnected.returns(false) // Should not matter
      const producerStub = sandbox.stub(Producer, 'allConnected').throws(new Error('Producer error'))
      const subServiceHealthProxy = proxyquire('../../../../src/lib/healthCheck/subServiceHealth', {
        '../../handlers/notification': Notification,
        '@mojaloop/central-services-stream': { Util: { Producer } },
        '../../lib/config': Config
      })

      const expected = { name: serviceName.broker, status: statusEnum.DOWN }

      // Act
      const result = await subServiceHealthProxy.getSubServiceHealthBroker()

      // Assert
      test.notOk(Notification.isConnected.called, 'Notification.isConnected should not be called when HANDLERS_DISABLED')
      test.ok(producerStub.calledOnce, 'Producer.allConnected should be called')
      test.deepEqual(result, expected, 'getSubServiceHealthBroker should return DOWN')
      Config.HANDLERS_DISABLED = originalHandlersDisabled
      test.end()
    })
    brokerTest.end()
  })

  subServiceHealthTest.test('getSubServiceHealthCentralLedger', centralLedgerTest => {
    centralLedgerTest.test('is down when can\'t connect to the central ledger', async test => {
      // Arrange
      axios.get.throws(new Error('Error connecting to central ledger'))
      const subServiceHealthProxy = proxyquire('../../../../src/lib/healthCheck/subServiceHealth', { axios })

      const expected = { name: 'participantEndpointService', status: statusEnum.DOWN }

      // Act
      const result = await subServiceHealthProxy.getSubServiceHealthCentralLedger()

      // Assert
      test.deepEqual(result, expected, 'getSubServiceHealthCentralLedger should match expected result')
      test.end()
    })

    centralLedgerTest.test('is down when the central ledger is down', async test => {
      // Arrange
      axios.get.resolves({ data: { status: 'DOWN' } })
      const subServiceHealthProxy = proxyquire('../../../../src/lib/healthCheck/subServiceHealth', { axios })

      const expected = { name: 'participantEndpointService', status: statusEnum.DOWN }

      // Act
      const result = await subServiceHealthProxy.getSubServiceHealthCentralLedger()

      // Assert
      test.deepEqual(result, expected, 'getSubServiceHealthCentralLedger should match expected result')
      test.end()
    })

    centralLedgerTest.test('is up when the central ledger is up', async test => {
      // Arrange
      axios.get.resolves({ data: { status: 'OK' } })
      const subServiceHealthProxy = proxyquire('../../../../src/lib/healthCheck/subServiceHealth', { axios })

      const expected = { name: 'participantEndpointService', status: statusEnum.OK }

      // Act
      const result = await subServiceHealthProxy.getSubServiceHealthCentralLedger()

      // Assert
      test.deepEqual(result, expected, 'getSubServiceHealthCentralLedger should match expected result')
      test.end()
    })

    centralLedgerTest.test('handles unknown status from the central ledger', async test => {
      // Arrange
      axios.get.resolves({ status: 12345 })
      const subServiceHealthProxy = proxyquire('../../../../src/lib/healthCheck/subServiceHealth', { axios })

      const expected = { name: 'participantEndpointService', status: statusEnum.DOWN }

      // Act
      const result = await subServiceHealthProxy.getSubServiceHealthCentralLedger()

      // Assert
      test.deepEqual(result, expected, 'getSubServiceHealthCentralLedger should match expected result')
      test.end()
    })

    centralLedgerTest.end()
  })

  subServiceHealthTest.end()
})
