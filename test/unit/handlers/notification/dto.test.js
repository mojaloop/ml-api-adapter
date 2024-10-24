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

 * Steven Oderayi <steven.oderayi@infitx.com>

 --------------
 ******/
'use strict'

const Proxyquire = require('proxyquire')
const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Util = require('@mojaloop/central-services-shared').Util
const { notificationMessageDto } = require('../../../../src/handlers/notification/dto')
const Fixtures = require('../../../fixtures')
const { logger } = require('../../../../src/shared/logger')
const { API_TYPES } = require('../../../../src/shared/constants')
const Config = require('../../../../src/lib/config')

Test('notificationMessageDto', async notificationMessageDtoTest => {
  let sandbox

  notificationMessageDtoTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    t.end()
  })

  notificationMessageDtoTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  notificationMessageDtoTest.test('return payload for callback from context', async test => {
    // Arrange
    const message = {
      value: Fixtures.createMessageProtocol(
        'prepare',
        'prepare',
        {
          errorInformation: {
            errorCode: '5001',
            errorDescription: 'Internal server error'
          }
        }
      )
    }
    const payloadCache = {
      getPayload: sandbox.stub().returns('originalRequestPayload')
    }

    // Act
    const result = await notificationMessageDto(message, payloadCache)

    // Assert
    test.equal(result.payloadForCallback, JSON.stringify(message.value.content.payload))
    test.notOk(payloadCache.getPayload.called)
    test.end()
  })

  notificationMessageDtoTest.test('return payload for callback from cache', async test => {
    // Arrange
    const message = {
      value: Fixtures.createMessageProtocol(
        'prepare',
        'prepare',
        {}
      )
    }
    message.value.content.context.originalRequestPayload = null
    message.value.content.context.originalRequestId = 'request-id'
    const originalRequestPayload = {
      transferId: 'transfer-id'
    }
    const payloadCache = {
      getPayload: sandbox.stub().returns(originalRequestPayload)
    }

    // Act
    const result = await notificationMessageDto(message, payloadCache)

    // Assert
    test.equal(result.payloadForCallback, JSON.stringify(originalRequestPayload))
    test.ok(payloadCache.getPayload.calledWith('request-id'))
    test.end()
  })

  notificationMessageDtoTest.test('throw error when original payload not found', async test => {
    // Arrange
    const message = {
      value: Fixtures.createMessageProtocol(
        'prepare',
        'prepare',
        {
          errorInformation: {
            errorCode: '5001',
            errorDescription: 'Internal server error'
          }
        }
      )
    }
    message.value.content.context.originalRequestPayload = null
    const payloadCache = {
      getPayload: sandbox.stub().returns(null)
    }
    const loggerErrorSpy = sandbox.stub(logger, 'error')

    // Act
    try {
      await notificationMessageDto(message, payloadCache)
      test.fail('Error not thrown')
    } catch (error) {
      // Assert
      test.equal(error.apiErrorCode.message, 'Internal server error')
      test.ok(loggerErrorSpy.calledWith('Notification::processMessage - Original payload not found'))
      test.end()
    }
  })

  notificationMessageDtoTest.test('log error when payload cache not initialized', async test => {
    // Arrange
    const message = {
      value: Fixtures.createMessageProtocol(
        'prepare',
        'prepare',
        {
          errorInformation: {
            errorCode: '5001',
            errorDescription: 'Internal server error'
          }
        }
      )
    }
    message.value.content.context.originalRequestPayload = undefined
    message.value.content.context.originalRequestId = 'request-id'
    const loggerErrorSpy = sandbox.stub(logger, 'error')

    // Act
    try {
      await notificationMessageDto(message, undefined)
      test.fail('Error not thrown')
    } catch (error) {
      // Assert
      test.equal(error.apiErrorCode.message, 'Internal server error')
      test.ok(loggerErrorSpy.calledWith('Notification::processMessage - Original payload not found'))
      test.ok(loggerErrorSpy.calledWith('Notification::processMessage - Payload cache not initialized'))
      test.end()
    }
  })

  notificationMessageDtoTest.test('create and trasform error payload in ISO20022', async test => {
    const ConfigStub = Util.clone(Config)
    ConfigStub.API_TYPE = API_TYPES.iso20022
    const notificationMessageDtoProxy = Proxyquire('../../../../src/handlers/notification/dto', {
      '../../lib/config': ConfigStub
    }).notificationMessageDto
    const message = {
      value: Fixtures.createMessageProtocol(
        'prepare',
        'prepare',
        {
          errorInformation: {
            errorCode: '3100',
            errorDescription: 'Generic Validation Error'
          }
        }
      )
    }

    // Act
    const result = await notificationMessageDtoProxy(message, undefined)

    const isoError = JSON.parse(result.payloadForCallback)
    // Assert
    test.equal(isoError.TxInfAndSts.StsRsnInf.Rsn.Cd, '3100')
    test.end()
  })

  await notificationMessageDtoTest.end()
})
