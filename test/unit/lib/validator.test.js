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

 * Georgi Georgiev <georgi.georgiev@modusbox.com>
 --------------
 ******/

'use strict'

const Test = require('tape')
const FSPIOPError = require('@mojaloop/central-services-error-handling').Factory.FSPIOPError
const Validator = require('../../../src/lib/validator')
const Proxyquire = require('proxyquire')
const Config = require('../../../src/lib/config')
const Util = require('@mojaloop/central-services-shared').Util

Test('validator', validatorTest => {
  validatorTest.test('fulfilTransfer should', fulfilTransferTest => {
    fulfilTransferTest.test('use default setting and pass validation when config is not found and current timestamp is used', test => {
      try {
        const request = {
          payload: {
            completedTimestamp: new Date()
          }
        }
        Validator.fulfilTransfer(request)
      } catch (err) {
        test.fail('Expect validation to pass')
      }
      test.end()
    })

    fulfilTransferTest.test('use setting with missing or undefined MAX_CALLBACK_TIME_LAG_DILATION_MILLISECONDS config', test => {
      const ConfigStub = Util.clone(Config)
      ConfigStub.MAX_CALLBACK_TIME_LAG_DILATION_MILLISECONDS = undefined
      const ValidatorProxy = Proxyquire('../../../src/lib/validator', {
        '../lib/config': ConfigStub
      })

      try {
        const request = {
          payload: {
            completedTimestamp: new Date()
          }
        }
        ValidatorProxy.fulfilTransfer(request)
      } catch (err) {
        test.fail('Expect validation to pass')
      }
      test.end()
    })

    fulfilTransferTest.test('use setting with missing or undefined MAX_FULFIL_TIMEOUT_DURATION_SECONDS config', test => {
      const ConfigStub = Util.clone(Config)
      ConfigStub.MAX_FULFIL_TIMEOUT_DURATION_SECONDS = undefined
      const ValidatorProxy = Proxyquire('../../../src/lib/validator', {
        '../lib/config': ConfigStub
      })

      try {
        const request = {
          payload: {
            // completedTimestamp: new Date(new Date().getTime() - 200)
            completedTimestamp: new Date()
          }
        }
        ValidatorProxy.fulfilTransfer(request)
      } catch (err) {
        test.fail('Expect validation to pass')
      }
      test.end()
    })

    fulfilTransferTest.test('throw an FSPIOPError if the transfer date is after now', test => {
      try {
        const request = {
          payload: {
            // Set transfer date to 30 minutess from now
            completedTimestamp: new Date(new Date().getTime() + (30 * 60000))
          }
        }
        Validator.fulfilTransfer(request)
        test.fail('Expect an error to be thrown')
      } catch (err) {
        test.ok(err instanceof FSPIOPError)
        test.equal(err.apiErrorCode.code, '3100')
      }
      test.end()
    })

    fulfilTransferTest.test('throw an FSPIOPError if the transfer date is older than max lag time', test => {
      try {
        const request = {
          payload: {
            // Set transfer date to 30 minutes before now
            completedTimestamp: new Date(new Date().getTime() - (30 * 60000))
          }
        }
        Validator.fulfilTransfer(request)
        test.fail('Expect an error to be thrown')
      } catch (err) {
        test.ok(err instanceof FSPIOPError)
        test.equal(err.apiErrorCode.code, '3100')
      }
      test.end()
    })
    fulfilTransferTest.end()
  })
  validatorTest.end()
})
