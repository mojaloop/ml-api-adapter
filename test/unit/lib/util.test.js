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

'use strict'

const Test = require('tapes')(require('tape'))
const Util = require('../../../src/lib/util')
const Config = require('../../../src/lib/config')
const path = require('path')
const { Enum: { Events: { Event: { Action } }, Tags: { QueryTags } } } = require('@mojaloop/central-services-shared')

Test('Util', (utilTests) => {
  utilTests.test('pathForInterface', async (pathForInterfaceTests) => {
    pathForInterfaceTests.test('pathForInterface should return correct path for default API', async (t) => {
      Config.API_TYPE = 'fspiop'
      const apiPath = Util.pathForInterface({ isHandlerInterface: false })
      const expectedAPIpathResult = path.join('interface', 'api-swagger.yaml')
      t.ok(apiPath.includes(expectedAPIpathResult), 'Correct path for default API')
      t.end()
    })

    pathForInterfaceTests.test('pathForInterface should return correct path for handler interface', async (t) => {
      Config.API_TYPE = 'fspiop'
      const apiPath = Util.pathForInterface({ isHandlerInterface: true })
      const expectedAPIpathResult = path.join('interface', 'handler-swagger.yaml')
      t.ok(apiPath.includes(expectedAPIpathResult), 'Correct path for handler interface')
      t.end()
    })

    pathForInterfaceTests.test('pathForInterface should return correct path for iso20022 API type', async (t) => {
      Config.API_TYPE = 'iso20022'
      const apiPath = Util.pathForInterface({ isHandlerInterface: false })
      const expectedAPIpathResult = path.join('interface', 'api-swagger-iso20022-transfers.yaml')
      t.ok(apiPath.includes(expectedAPIpathResult), 'Correct path for iso20022 API type')
      t.end()
    })

    pathForInterfaceTests.test('pathForInterface should return correct path for non-iso20022 API type', async (t) => {
      Config.API_TYPE = 'non-iso20022'
      const apiPath = Util.pathForInterface({ isHandlerInterface: false })
      const expectedAPIpathResult = path.join('interface', 'api-swagger.yaml')
      t.ok(apiPath.includes(expectedAPIpathResult), 'Correct path for non-iso20022 API type')
      t.end()
    })

    pathForInterfaceTests.test('pathForInterface should handle undefined API_TYPE gracefully', async (t) => {
      Config.API_TYPE = undefined
      const apiPath = Util.pathForInterface({ isHandlerInterface: false })
      const expectedAPIpathResult = path.join('interface', 'api-swagger.yaml')
      t.ok(apiPath.includes(expectedAPIpathResult), 'Correct path for undefined API_TYPE')
      t.end()
    })

    pathForInterfaceTests.test('pathForInterface should handle null API_TYPE gracefully', async (t) => {
      Config.API_TYPE = null
      const apiPath = Util.pathForInterface({ isHandlerInterface: false })
      const expectedAPIpathResult = path.join('interface', 'api-swagger.yaml')
      t.ok(apiPath.includes(expectedAPIpathResult), 'Correct path for null API_TYPE')
      t.end()
    })

    pathForInterfaceTests.test('pathForInterface should handle empty string API_TYPE gracefully', async (t) => {
      Config.API_TYPE = ''
      const apiPath = Util.pathForInterface({ isHandlerInterface: false })
      const expectedAPIpathResult = path.join('interface', 'api-swagger.yaml')
      t.ok(apiPath.includes(expectedAPIpathResult), 'Correct path for empty string API_TYPE')
      t.end()
    })

    pathForInterfaceTests.end()
  })

  utilTests.test('setProp', async (setPropTests) => {
    setPropTests.test('setProp should set a nested property in an object', async (t) => {
      const obj = {}
      Util.setProp(obj, 'a.b.c', 'value')
      t.equal(obj.a.b.c, 'value')
      t.end()
    })

    setPropTests.test('setProp should not set __proto__ property in an object', async (t) => {
      const obj = {}
      Util.setProp(obj, '__proto__.polluted', 'value')
      // eslint-disable-next-line no-proto
      t.notOk(obj.__proto__.polluted, 'Should not set __proto__ property')
      t.end()
    })

    setPropTests.test('setProp should not set constructor property in an object', async (t) => {
      const obj = {}
      Util.setProp(obj, 'constructor.polluted', 'value')
      t.notOk(obj.constructor.polluted, 'Should not set constructor property')
      t.end()
    })

    setPropTests.end()
  })

  utilTests.test('getAuditOperationForAction', async (getAuditOperationForActionTests) => {
    const operationsActionsMap = [
      { action: Action.COMMIT, operation: QueryTags.operation.commitTransfer },
      { action: Action.FX_COMMIT, operation: QueryTags.operation.commitFxTransfer },
      { action: Action.RESERVE, operation: QueryTags.operation.reserveTransfer },
      { action: Action.FX_RESERVE, operation: QueryTags.operation.reserveFxTransfer },
      { action: Action.REJECT, operation: QueryTags.operation.rejectTransfer },
      { action: Action.FX_REJECT, operation: QueryTags.operation.rejectFxTransfer },
      { action: Action.ABORT, operation: QueryTags.operation.abortTransfer },
      { action: Action.FX_ABORT, operation: QueryTags.operation.abortFxTransfer },
      { action: Action.ABORT_VALIDATION, operation: QueryTags.operation.abortTransferValidation },
      { action: Action.FX_ABORT_VALIDATION, operation: QueryTags.operation.abortFxTransferValidation },
      { action: Action.ABORT_DUPLICATE, operation: QueryTags.operation.abortDuplicateTransfer },
      { action: Action.FX_ABORT_DUPLICATE, operation: QueryTags.operation.abortDuplicateFxTransfer },
      { action: Action.TIMEOUT_RECEIVED, operation: QueryTags.operation.timeoutReceived },
      { action: Action.FX_TIMEOUT_RECEIVED, operation: QueryTags.operation.fxTimeoutReceived },
      { action: Action.TIMEOUT_RESERVED, operation: QueryTags.operation.timeoutReserved },
      { action: Action.TIMEOUT_RESERVED, operation: QueryTags.operation.fxTimeoutReserved },
      { action: Action.RESERVE, operation: QueryTags.operation.reserveTransfer },
      { action: Action.FX_RESERVE, operation: QueryTags.operation.reserveFxTransfer }
    ]
    console.log(operationsActionsMap)

    getAuditOperationForActionTests.test('should return correct operation for commit action', async (t) => {
      const operation = Util.getAuditOperationForAction('commit')
      t.equal(operation, 'commitTransfer')
      t.end()
    })

    getAuditOperationForActionTests.test('should return correct operation for commit action', async (t) => {
      const operation = Util.getAuditOperationForAction('commit')
      t.equal(operation, 'commitTransfer')
      t.end()
    })

    getAuditOperationForActionTests.test('should return correct operation for reserve action', async (t) => {
      const operation = Util.getAuditOperationForAction('reserve')
      t.equal(operation, 'reserveTransfer')
      t.end()
    })

    getAuditOperationForActionTests.test('should return correct operation for reject action', async (t) => {
      const operation = Util.getAuditOperationForAction('reject')
      t.equal(operation, 'rejectTransfer')
      t.end()
    })

    getAuditOperationForActionTests.test('should return correct operation for abort action', async (t) => {
      const operation = Util.getAuditOperationForAction('abort')
      t.equal(operation, 'abortTransfer')
      t.end()
    })

    getAuditOperationForActionTests.test('should return correct operation for abort validation action', async (t) => {
      const operation = Util.getAuditOperationForAction('abort-validation')
      t.equal(operation, 'abortTransferValidation')
      t.end()
    })

    getAuditOperationForActionTests.test('should return correct operation for commit fx action', async (t) => {
      const operation = Util.getAuditOperationForAction('fx-commit', true)
      t.equal(operation, 'commitFxTransfer')
      t.end()
    })

    getAuditOperationForActionTests.test('should return correct operation for reserve fx action', async (t) => {
      const operation = Util.getAuditOperationForAction('fx-reserve', true)
      t.equal(operation, 'reserveFxTransfer')
      t.end()
    })

    getAuditOperationForActionTests.test('should return correct operation for reject fx action', async (t) => {
      const operation = Util.getAuditOperationForAction('fx-reject', true)
      t.equal(operation, 'rejectFxTransfer')
      t.end()
    })

    getAuditOperationForActionTests.test('should return correct operation for abort fx action', async (t) => {
      const operation = Util.getAuditOperationForAction('fx-abort', true)
      t.equal(operation, 'abortFxTransfer')
      t.end()
    })

    getAuditOperationForActionTests.test('should throw if action is invalid', async (t) => {
      t.throws(() => Util.getAuditOperationForAction('invalidAction'), 'Invalid action should throw')
      t.end()
    })

    getAuditOperationForActionTests.end()
  })

  utilTests.end()
})
