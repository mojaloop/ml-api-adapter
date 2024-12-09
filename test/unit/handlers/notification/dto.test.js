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
const { API_TYPES } = require('../../../../src/shared/constants')
const Config = require('../../../../src/lib/config')
const { decodePayload } = Util.StreamingProtocol

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
    test.deepEqual(JSON.parse(result.payloadForCallback), message.value.content.payload)
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
    const originalRequestPayload = 'data:application/vnd.interoperability.iso20022.transfers+json;version=2.0;base64,ewogICAgIkdycEhkciI6IHsKICAgICJNc2dJZCI6ICIwMUo4Ukc3MzRONTZNRUY2RFZXTlpZQjhLUCIsCiAgICAiUG10SW5zdHJYcHJ5RHRUbSI6ICIyMDExLTEwLTA1VDE0OjQ4OjAwLjAwMFoiLAogICAgIkNyZUR0VG0iOiAiMjAxMS0xMC0wNVQxNDo0ODowMC4wMDBaIiwKICAgICJOYk9mVHhzIjogIjEiLAogICAgIlN0dGxtSW5mIjogewogICAgIlN0dGxtTXRkIjogIkNMUkciCiAgICB9LAogICAgIkN0cmxTdW0iOiAiMTAwIiwKICAgICJJbml0Z1B0eSI6IHsKICAgICJObSI6ICJJbml0aWF0aW5nIFBhcnR5IE5hbWUiLAogICAgIklkIjogewogICAgICAgICJPcmdJZCI6IHsKICAgICAgICAiT3RociI6IFsKICAgICAgICAgICAgewogICAgICAgICAgICAiSWQiOiAiMTIzNDU2Nzg5IiwKICAgICAgICAgICAgIlNjaG1lTm0iOiB7CiAgICAgICAgICAgICAgICAiQ2QiOiAiQkJBIiwKICAgICAgICAgICAgICAgICJQcnRyeSI6ICJQYXJ0eSBJZGVudGlmaWNhdGlvbiBTY2hlbWUgTmFtZSIKICAgICAgICAgICAgfQogICAgICAgICAgICB9CiAgICAgICAgXQogICAgICAgIH0KICAgIH0KICAgIH0sCiAgICAiRndkZ0FndCI6IHsKICAgICJGaW5JbnN0bklkIjogewogICAgICAgICJCSUNGSSI6ICJCQkJCQkJCQiIKICAgIH0KICAgIH0KfSwKIkNkdFRyZlR4SW5mIjogewogICAgIlZyZmN0bk9mVGVybXMiOiB7CiAgICAiSWxwVjRQcmVwUGFja2V0IjogIkRJSURTZ0FBQUFBQUFNTlFNakF4TnpFeE1UVXlNekUzTWpnNU9EVlBxel9FNzA3QmU2aGVKMHVERi11cC1VRWowMTNkTkFLa1UxWHkwYnVYcVFwbkxtMXZhbUZzYjI5d2dnTURaWGxLZUdSWE9UQmFWV3hyU1dwdmFVMXFRVEZOUkdkNFQwUlpkRTFVVVRGUFF6QXdXVmROZDB4WFJUUk5hbEYwV2tSU2FVMUVaR3hOZW1SclRqSkpla2xwZDJsa1NFcG9ZbTVPYUZrelVuQmlNalZLV2tOSk5rbHFTWGRPVkVFMFRWUm5Na3hVUlRCT1ZHZDBUa2RHYWsxRE1XaFBSRWt3VEZkUk1GbHFRVE5hVkUweldrUmthVTE1U1hOSmJsSjVXVmMxZWxsWFRqQmhWemwxVmtoc2QxcFRTVFpsZVVwNldUSldkVmxZU25CaWVVazJTV3hTVTFGVk5WUlNhMVpUU1dsM2FXRlhOWEJrUjJ4b1pFYzVlVWxxYjJsVlJVWmFVbFpKYVV4RFNuQmliV3d3WVZkR01HSXpTbFZsV0VKc1NXcHZhVkV3T1U5Vk1WWk9VbFpKYVV4RFNtbFpWM2hvWW0xT2JGUXlXbEZaV0d4MFdsYzFNR041U1RaSmFrVjRUVU5LT1V4RFNuZFpXR3hzV2xOSk5tVjVTbmRaV0Vvd1pWVnNhMU5YTlcxaWVVazJaWGxLZDFsWVNqQmxWV3hyVmtoc2QxcFRTVFpKYXpGVVUxWk9SVlJwU1hOSmJrSm9ZMjVTTlZOWFVteGlibEp3V20xc2JHTnBTVFpKYWtWNVRYcFJNVTVxWXpSUFUwbHpTVzFhZW1ORmJHdEphbTlwVkZjNWFXRlhlR3hVVnpsMVdsaHJhV1pZTUhOSmJrSm9aVmRXZVVscWNEZEpia0pzWTI1T2RtSnRSbk5UVnpWdFlubEpObVY1U21waU1qRjNZa2RXTkZSdFJuUmFVMGsyWlhsS2JXRllTbnBrUlRWb1lsZFZhVTlwU2s1WldGSjZTV2wzYVdKSFJucGtSVFZvWWxkVmFVOXBTa2xaVjJSMFdWYzBhV1pZTUhOSmJrSm9ZMjVTTlZOWFVrcGliVnAyU1dwd04wbHVRbWhqYmxJMVUxZFNWV1ZZUW14SmFtOXBWRlpPU2xVd1VrOUphWGRwWTBkR2VXUkliRXBhUjFaMVpFZHNiV0ZYVm5sSmFtOXBUMVJuTTA1cVZUQk5lVWx6U1cxYWVtTkZiR3RKYW05cFVXMUdkV0V3TlhsVU1qVnNTVzR4T1V4RFNteGxTRUp3WTIxR01HRlhPWFZKYW05cFRXcEJlRTU1TUhoTlV6QjRUbFpSZVUxcWIzaE9lbTk1VDBNME5VOUVWWFJOUkVVMlRVUkJhVXhEU21oaVZ6a3hZbTVSYVU5dWMybFpWekYyWkZjMU1FbHFiMmxPVkVGM1NXbDNhVmt6Vm5samJWWjFXVE5yYVU5cFNsWlZNRkZwWmxndyIKICAgIH0sCiAgICAiUG10SWQiOiB7CiAgICAiVHhJZCI6ICIwMUo4Ukc3MlpUNkRQNzNLS0dNQVNSQkYwRiIsCiAgICAiSW5zdHJJZCI6ICIwMUo4Ukc3MlpUNkRQNzNLS0dNQVNSQkYwRiIsCiAgICAiRW5kVG9FbmRJZCI6ICIwMUo4Ukc3MlpUNkRQNzNLS0dNQVNSQkYwRiIKICAgIH0sCiAgICAiUG10VHBJbmYiOiB7CiAgICAiSW5zdHJQcnR5IjogIk5PUk0iLAogICAgIlN2Y0x2bCI6IHsKICAgICAgICAiQ2QiOiAiU0VQQSIKICAgIH0sCiAgICAiTGNsSW5zdHJtIjogewogICAgICAgICJDZCI6ICJDSDAzIgogICAgfSwKICAgICJDdGd5UHVycCI6IHsKICAgICAgICAiQ2QiOiAiU1VQUCIKICAgIH0KICAgIH0sCiAgICAiSW50ckJrU3R0bG1BbXQiOiB7CiAgICAiQ2N5IjogIlhUUyIsCiAgICAiQWN0aXZlQ3VycmVuY3lBbmRBbW91bnQiOiAiMTAwIgogICAgfSwKICAgICJJbnN0ZEFtdCI6IHsKICAgICJDY3kiOiAiWFRTIiwKICAgICJBY3RpdmVPckhpc3RvcmljQ3VycmVuY3lBbmRBbW91bnQiOiAiMTAwIgogICAgfSwKICAgICJDaHJnQnIiOiAiREVCVCIsCiAgICAiQ2hyZ3NJbmYiOiB7CiAgICAiQW10IjogewogICAgICAgICJDY3kiOiAiWFRTIiwKICAgICAgICAiQWN0aXZlT3JIaXN0b3JpY0N1cnJlbmN5QW5kQW1vdW50IjogIjEwMCIKICAgIH0sCiAgICAiQWd0IjogewogICAgICAgICJGaW5JbnN0bklkIjogewogICAgICAgICJPdGhyIjogewogICAgICAgICAgICAiSWQiOiAiMTIzNDU2Nzg5IiwKICAgICAgICAgICAgIlNjaG1lTm0iOiB7CiAgICAgICAgICAgICJDZCI6ICJCQkEiLAogICAgICAgICAgICAiUHJ0cnkiOiAiUGFydHkgSWRlbnRpZmljYXRpb24gU2NoZW1lIE5hbWUiCiAgICAgICAgICAgIH0KICAgICAgICB9CiAgICAgICAgfQogICAgfQogICAgfSwKICAgICJDZHRyIjogewogICAgIk5hbWUiOiAiVGVzdCBDcmVkaXRvciIsCiAgICAiSWQiOiB7CiAgICAgICAgIk9yZ0lkIjogewogICAgICAgICJPdGhyIjogewogICAgICAgICAgICAiSWQiOiAiNTQzMjEiLAogICAgICAgICAgICAiU2NobWVObSI6IHsKICAgICAgICAgICAgIlBydHJ5IjogIkFDQ09VTlRfSUQiCiAgICAgICAgICAgIH0KICAgICAgICB9CiAgICAgICAgfQogICAgfQogICAgfSwKICAgICJEYnRyIjogewogICAgIk5hbWUiOiAiVGVzdCBEZWJpdG9yIiwKICAgICJJZCI6IHsKICAgICAgICAiT3JnSWQiOiB7CiAgICAgICAgIk90aHIiOiB7CiAgICAgICAgICAgICJJZCI6ICIxMjM0NSIsCiAgICAgICAgICAgICJTY2htZU5tIjogewogICAgICAgICAgICAiUHJ0cnkiOiAiQUNDT1VOVF9JRCIKICAgICAgICAgICAgfQogICAgICAgIH0KICAgICAgICB9CiAgICB9CiAgICB9LAogICAgIkRidHJBZ3QiOiB7CiAgICAiRmluSW5zdG5JZCI6IHsKICAgICAgICAiT3RociI6IHsKICAgICAgICAiSWQiOiAieCIsCiAgICAgICAgIlNjaG1lTm0iOiB7CiAgICAgICAgICAgICJDZCI6ICJCRElEIgogICAgICAgIH0KICAgICAgICB9CiAgICB9CiAgICB9LAogICAgIkNkdHJBZ3QiOiB7CiAgICAiRmluSW5zdG5JZCI6IHsKICAgICAgICAiT3RociI6IHsKICAgICAgICAiSWQiOiAieCIsCiAgICAgICAgIlNjaG1lTm0iOiB7CiAgICAgICAgICAgICJDZCI6ICJCRElEIgogICAgICAgIH0KICAgICAgICB9CiAgICB9CiAgICB9LAogICAgIkRidHJBY2N0IjogewogICAgIklkIjogewogICAgICAgICJJQkFOIjogIlhUMTQyMDA0MTAxMDA1MDUwMDAxM00wMjYwNiIsCiAgICAgICAgIkNjeSI6ICJYVFMiCiAgICB9CiAgICB9LAogICAgIkRidHJBZ3RBY2N0IjogewogICAgIklkIjogewogICAgICAgICJJQkFOIjogIlhUMTQyMDA0MTAxMDA1MDUwMDAxM00wMjYwNiIsCiAgICAgICAgIkNjeSI6ICJYVFMiCiAgICB9CiAgICB9LAogICAgIkNkdHJBY2N0IjogewogICAgIklkIjogewogICAgICAgICJJQkFOIjogIlhUMTQyMDA0MTAxMDA1MDUwMDAxM00wMjYwNiIsCiAgICAgICAgIkNjeSI6ICJYVFMiCiAgICB9CiAgICB9LAogICAgIkNkdHJBZ3RBY2N0IjogewogICAgIklkIjogewogICAgICAgICJJQkFOIjogIlhUMTQyMDA0MTAxMDA1MDUwMDAxM00wMjYwNiIsCiAgICAgICAgIkNjeSI6ICJYVFMiCiAgICB9CiAgICB9LAogICAgIlVsdG10Q2R0ciI6IHsKICAgICJObSI6ICJVbHRpbWF0ZSBDcmVkaXRvciBOYW1lIiwKICAgICJQc3RsQWRyIjogewogICAgICAgICJBZHJUcCI6IHsKICAgICAgICAiQ2QiOiAiQUREUiIKICAgICAgICB9LAogICAgICAgICJEZXB0IjogIkRlcGFydG1lbnQiLAogICAgICAgICJTdWJEZXB0IjogIlN1YkRlcGFydG1lbnQiLAogICAgICAgICJTdHJ0Tm0iOiAiU3RyZWV0TmFtZSIsCiAgICAgICAgIkJsZGdOYiI6ICJCdWlsZGluZ051bWJlciIsCiAgICAgICAgIlBzdENkIjogIlBvc3RDb2RlIiwKICAgICAgICAiVHduTm0iOiAiVG93bk5hbWUiLAogICAgICAgICJDdHJ5U3ViRHZzbiI6ICJDb3VudHJ5U3ViRGl2aXNpb24iLAogICAgICAgICJDdHJ5IjogIkFaIgogICAgfSwKICAgICJJZCI6IHsKICAgICAgICAiT3JnSWQiOiB7CiAgICAgICAgIkFueUJJQyI6ICJCQkJCQkJCQiIsCiAgICAgICAgIk90aHIiOiB7CiAgICAgICAgICAgICJJZCI6ICIxMjM0NTY3ODkiLAogICAgICAgICAgICAiU2NobWVObSI6IHsKICAgICAgICAgICAgIkNkIjogIklCQU4iLAogICAgICAgICAgICAiUHJ0cnkiOiAiUGFydHkgSWRlbnRpZmljYXRpb24gU2NoZW1lIE5hbWUiCiAgICAgICAgICAgIH0KICAgICAgICB9CiAgICAgICAgfQogICAgfQogICAgfSwKICAgICJSZ2x0cnlScHRnIjogewogICAgIkRidENkdFJwdGdJbmQiOiAiQ1JFRCIsCiAgICAiQXV0aHJ0eSI6IHsKICAgICAgICAiTm0iOiAiU3dpc3MgTmF0aW9uYWwgQmFuayIsCiAgICAgICAgIkN0cnkiOiAiQ0giCiAgICB9CiAgICB9Cn0KfQ=='
    const payloadCache = {
      getPayload: sandbox.stub().returns(originalRequestPayload)
    }

    // Act
    const result = await notificationMessageDto(message, payloadCache)

    // Assert
    test.deepEqual(result.payloadForCallback, decodePayload(originalRequestPayload, { asParsed: false }).body)
    test.ok(payloadCache.getPayload.calledWith('request-id'))
    test.end()
  })

  notificationMessageDtoTest.test('return current message payload if original payload not found', async test => {
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
    const result = await notificationMessageDto(message, payloadCache)
    test.deepEqual(result.content.payload, message.value.content.payload)
    test.end()
  })

  notificationMessageDtoTest.test('create and transform error payload in ISO20022 for hub-generated errors', async test => {
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
    message.value.content.headers['fspiop-source'] = Config.HUB_NAME
    Proxyquire.callThru()
    // Act
    const result = await notificationMessageDtoProxy(message, undefined)

    const isoError = JSON.parse(result.payloadForCallback)

    // Assert
    test.equal(isoError.TxInfAndSts.StsRsnInf.Rsn.Cd, '3100')
    test.end()
  })

  await notificationMessageDtoTest.end()
})
