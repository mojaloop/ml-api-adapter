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
 - Name Surname <name.surname@gatesfoundation.com>

 * Lewis Daly <lewis@vesselstech.com>

 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const proxyquire = require('proxyquire')

const { statusEnum, serviceName } = require('@mojaloop/central-services-shared').HealthCheck.HealthCheckEnums

const Notification = require('../../../../src/handlers/notification/index')
const Config = require('../../../../src/lib/config')


const {
  getSubServiceHealthBroker,
  getSubServiceHealthCentralLedger
} = require('../../../../src/lib/healthCheck/subServiceHealth')

Test('SubServiceHealth test', subServiceHealthTest => {
  let sandbox
  let request

  subServiceHealthTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Notification, 'isConsumerConnected')
    request = sandbox.stub()

    t.end()
  })

  subServiceHealthTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  subServiceHealthTest.test('getSubServiceHealthBroker', brokerTest => {
    brokerTest.test('broker test fails when one broker cannot connect', async test => {
      // Arrange
      Notification.isConsumerConnected.throws(new Error('Not connected!'))
      const expected = { name: serviceName.broker, status: statusEnum.DOWN }

      // Act
      const result = await getSubServiceHealthBroker()

      // Assert
      test.deepEqual(result, expected, 'getSubServiceHealthBroker should match expected result')
      test.end()
    })

    brokerTest.test('Passes when it connects', async test => {
      // Arrange
      Notification.isConsumerConnected.returns(Promise.resolve(true))
      const expected = { name: serviceName.broker, status: statusEnum.OK }

      // Act
      const result = await getSubServiceHealthBroker()

      // Assert
      test.deepEqual(result, expected, 'getSubServiceHealthBroker should match expected result')
      test.end()
    })

    brokerTest.end()
  })


  subServiceHealthTest.test('getSubServiceHealthCentralLedger', centralLedgerTest => {

    /*
     - is down when can't connect to the central ledger
     - is down when the central ledger is down
     - is up when the central ledger is up
    */

    centralLedgerTest.test('is down when can\'t connect to the central ledger', async test => {
      // Arrange
      // request.throws(new Error('Cannot connect'))
      const requestOptions = {
        url: Config.ENDPOINT_HEALTH_URL,
        json: true
      }
      request.withArgs(requestOptions).yields(new Error(), null, null)
      // request.yields(new Error(), null, null)
      const subServiceHealthProxy = proxyquire('../../../../src/lib/healthCheck/subServiceHealth', { 'request': request })

      console.log('proxy function', subServiceHealthProxy)

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
