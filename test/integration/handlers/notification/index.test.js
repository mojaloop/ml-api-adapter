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

 * Georgi Georgiev <georgi.georgiev@modusbox.com>
 * Shashikant Hirugade <shashikant.hirugade@modusbox.com>
 * Miguel de Barros <miguel.debarros@modusbox.com>

 --------------
 ******/
'use strict'

const Test = require('tapes')(require('tape'))
const Uuid = require('uuid4')
const db = require('@mojaloop/database-lib').Db
const Logger = require('@mojaloop/central-services-logger')
const proxyLib = require('@mojaloop/inter-scheme-proxy-cache-lib')
const { Kafka: KafkaUtil, HeaderValidation, Request } = require('@mojaloop/central-services-shared').Util
const Enum = require('@mojaloop/central-services-shared').Enum
const encodePayload = require('@mojaloop/central-services-shared').Util.StreamingProtocol.encodePayload
const Kafka = require('@mojaloop/central-services-stream').Util
const Config = require('../../../../src/lib/config')
const centralLedgerConfig = require('../../../../docker/central-ledger/default.json')
const { prepare } = require('../../../../src/domain/transfer/index')
const Fixtures = require('../../../fixtures')
const { API_TYPES } = require('../../../../src/shared/constants')
const { createPayloadCache } = require('../../../../src/lib/payloadCache')
const { PAYLOAD_STORAGES } = require('../../../../src/lib/payloadCache/constants')
const { TransformFacades } = require('@mojaloop/ml-schema-transformer-lib')

const { Action } = Enum.Events.Event
const EventTypes = Enum.Events.Event.Type
const EventActions = Enum.Events.Event.Action
const GeneralTopicTemplate = Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE

const timeoutAttempts = 15
const callbackWaitSeconds = 3
const retryDelay = process?.env?.test_INT_RETRY_DELAY || 2
const retryCount = process?.env?.test_INT_RETRY_COUNT || 40
const retryOpts = {
  retries: retryCount,
  minTimeout: retryDelay,
  maxTimeout: retryDelay
}
const wrapWithRetriesConf = {
  remainingRetries: retryOpts?.retries || 10, // default 10
  timeout: retryOpts?.maxTimeout || 2 // default 2
}

const getNotificationUrl = process.env.ENDPOINT_URL
const apiType = process.env.API_TYPE
const originalPayloadStorage = process.env.ORIGINAL_PAYLOAD_STORAGE || ''
const hubNameRegex = HeaderValidation.getHubNameRegex(Config.HUB_NAME)

const testNotification = async (messageProtocol, operation, transferId, kafkaConfig, topicConfig, checkSenderResponse = false, senderOperation = null, proxy) => {
  await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)

  senderOperation = senderOperation || operation

  let response = await getNotifications(proxy || messageProtocol.to, operation, transferId)
  let responseFrom = checkSenderResponse ? await getNotifications(messageProtocol.from, senderOperation, transferId) : true

  let currentAttempts = 0
  while (!(response && responseFrom) && currentAttempts < (timeoutAttempts * callbackWaitSeconds)) {
    sleep(callbackWaitSeconds)
    response = response || await getNotifications(proxy || messageProtocol.to, operation, transferId)
    responseFrom = responseFrom || checkSenderResponse ? await getNotifications(messageProtocol.from, senderOperation, transferId) : true
    currentAttempts++
  }
  return checkSenderResponse ? { responseTo: response, responseFrom } : response
}

Test('Notification Handler', notificationHandlerTest => {
  notificationHandlerTest.test('should', async notificationTest => {
    let proxy

    notificationTest.test('connect proxy lib', async test => {
      const { type, proxyConfig } = Fixtures.proxyCacheConfigDto()
      proxy = proxyLib.createProxyCache(type, proxyConfig)
      await proxy.connect()
      test.pass('Connected proxy lib')
      test.end()
    })

    notificationTest.test('throw an error if invalid message is received', async test => {
      try {
        await Kafka.Consumer.consumeMessage(null, null, null)
        test.fail('Error not thrown!')
      } catch (err) {
        test.ok(err instanceof Error)
        test.end()
      }
    })

    notificationTest.test('consume a PREPARE message and send POST callback', async test => {
      const transferId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.PREPARE,
        Action.PREPARE,
        {
          amount: { amount: 100, currency: 'USD' },
          condition: 'uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvze1',
          expiration: '2018-08-24T21:31:00.534+01:00',
          ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
          payerFsp: 'dfsp3',
          payeeFsp: 'dfsp4',
          transferId
        },
        'dfsp3',
        'dfsp4'
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.PREPARE,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const response = await testNotification(messageProtocol, 'post', transferId, kafkaConfig, topicConfig)

      test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to Payee')
      test.end()
    })

    notificationTest.test('consume a PREPARE message and send POST callback to proxy', async test => {
      await proxy.addDfspIdToProxyMapping('proxied2', 'dfsp2') // simulate proxy mapping
      const transferId = Uuid()
      const payload = {
        amount: { amount: 1, currency: 'USD' },
        condition: 'uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvze1',
        expiration: '2040-01-01T00:00:00.000',
        ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
        payerFsp: 'dfsp1',
        payeeFsp: 'proxied2',
        transferId
      }
      await prepare(
        {
          'fspiop-source': payload.payerFsp,
          'fspiop-destination': payload.payeeFsp
        },
        encodePayload(JSON.stringify(payload), 'application/vnd.interoperability.transfers+json;version=1.1'),
        payload,
        { injectContextToMessage: msg => msg }
      )
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.PREPARE,
        Action.PREPARE,
        payload,
        payload.payerFsp,
        payload.payeeFsp
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.PREPARE,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      await db.connect({
        client: centralLedgerConfig.DATABASE.DIALECT,
        connection: {
          host: 'localhost',
          port: centralLedgerConfig.DATABASE.PORT,
          user: centralLedgerConfig.DATABASE.USER,
          password: centralLedgerConfig.DATABASE.PASSWORD,
          database: centralLedgerConfig.DATABASE.SCHEMA
        }
      })

      // wait for RESERVED
      try {
        await wrapWithRetries(async () => {
          const stateChange = await db
            .from('transferStateChange')
            .findOne({ transferId, transferStateId: Enum.Transfers.TransferInternalState.RESERVED })
          if (stateChange?.transferStateId !== Enum.Transfers.TransferInternalState.RESERVED) {
            throw new Error('Transfer state not changed to RESERVED')
          }
          test.equal(stateChange.transferStateId, Enum.Transfers.TransferInternalState.RESERVED, 'Transfer state changed to RESERVED')
          return stateChange
        }, wrapWithRetriesConf.remainingRetries, wrapWithRetriesConf.timeout)
      } catch (err) {
        Logger.error(err)
        test.fail(err.message)
      }

      const response = await testNotification(messageProtocol, 'post', transferId, kafkaConfig, topicConfig, undefined, undefined, 'dfsp2')
      test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to Payee')
      // wait for RESERVED_FORWARDED
      try {
        await wrapWithRetries(async () => {
          const stateChange = await db
            .from('transferStateChange')
            .findOne({ transferId, transferStateId: Enum.Transfers.TransferInternalState.RESERVED_FORWARDED })
          if (stateChange?.transferStateId !== Enum.Transfers.TransferInternalState.RESERVED_FORWARDED) {
            throw new Error('Transfer state not changed to RESERVED_FORWARDED')
          }
          test.equal(stateChange.transferStateId, Enum.Transfers.TransferInternalState.RESERVED_FORWARDED, 'Transfer state changed to RESERVED_FORWARDED')
          return stateChange
        }, wrapWithRetriesConf.remainingRetries, wrapWithRetriesConf.timeout)
      } catch (err) {
        Logger.error(err)
        test.fail(err.message)
      }

      await db.disconnect()
      test.end()
    })

    notificationTest.test('consume a FX_PREPARE message and send POST callback', async test => {
      const commitRequestId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.PREPARE,
        Action.FX_PREPARE,
        {
          commitRequestId,
          determiningTransferId: Uuid(),
          initiatingFsp: 'dfsp1',
          counterPartyFsp: 'fxp1',
          amountType: 'SEND',
          sourceAmount: { amount: 100, currency: 'KWS' },
          targetAmount: { amount: 200, currency: 'TZS' },
          condition: 'uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvze1',
          expiration: '2018-08-24T21:31:00.534+01:00',
          ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA'
        },
        'dfsp1',
        'fxp1'
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.PREPARE,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const response = await testNotification(messageProtocol, 'post', commitRequestId, kafkaConfig, topicConfig)

      test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to FXP')
      test.end()
    })

    notificationTest.test('consume a FX_PREPARE message and send POST callback to proxy', async test => {
      await proxy.addDfspIdToProxyMapping('proxied2', 'fxp1') // simulate proxy mapping
      const commitRequestId = Uuid()
      const payload = {
        commitRequestId,
        determiningTransferId: Uuid(),
        initiatingFsp: 'dfsp1',
        counterPartyFsp: 'proxied2',
        amountType: 'SEND',
        sourceAmount: { amount: 100, currency: 'USD' },
        targetAmount: { amount: 200, currency: 'USD' },
        condition: 'uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvze1',
        expiration: new Date((new Date()).getTime() + (24 * 60 * 60 * 1000)).toISOString(), // tomorrow
        ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA'
      }
      await prepare(
        {
          'fspiop-source': payload.initiatingFsp,
          'fspiop-destination': payload.counterPartyFsp
        },
        encodePayload(JSON.stringify(payload), 'application/vnd.interoperability.fxTransfers+json;version=1.1'),
        payload,
        { injectContextToMessage: msg => msg }
      )
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.PREPARE,
        Action.FX_PREPARE,
        payload,
        payload.initiatingFsp,
        payload.counterPartyFsp
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.PREPARE,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      await db.connect({
        client: centralLedgerConfig.DATABASE.DIALECT,
        connection: {
          host: 'localhost',
          port: centralLedgerConfig.DATABASE.PORT,
          user: centralLedgerConfig.DATABASE.USER,
          password: centralLedgerConfig.DATABASE.PASSWORD,
          database: centralLedgerConfig.DATABASE.SCHEMA
        }
      })

      // wait for RESERVED
      try {
        await wrapWithRetries(async () => {
          const stateChange = await db
            .from('fxTransferStateChange')
            .findOne({ commitRequestId, transferStateId: Enum.Transfers.TransferInternalState.RESERVED })
          if (stateChange?.transferStateId !== Enum.Transfers.TransferInternalState.RESERVED) {
            throw new Error('Transfer state not changed to RESERVED')
          }
          test.equal(stateChange.transferStateId, Enum.Transfers.TransferInternalState.RESERVED, 'Transfer state changed to RESERVED')
          return stateChange
        }, wrapWithRetriesConf.remainingRetries, wrapWithRetriesConf.timeout)
      } catch (err) {
        Logger.error(err)
        test.fail(err.message)
      }

      const response = await testNotification(messageProtocol, 'post', commitRequestId, kafkaConfig, topicConfig, undefined, undefined, 'fxp1')
      test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to FXP')

      // wait for RESERVED_FORWARDED
      try {
        await wrapWithRetries(async () => {
          const stateChange = await db
            .from('fxTransferStateChange')
            .findOne({ commitRequestId, transferStateId: Enum.Transfers.TransferInternalState.RESERVED_FORWARDED })
          if (stateChange?.transferStateId !== Enum.Transfers.TransferInternalState.RESERVED_FORWARDED) {
            throw new Error('Transfer state not changed to RESERVED_FORWARDED')
          }
          test.equal(stateChange.transferStateId, Enum.Transfers.TransferInternalState.RESERVED_FORWARDED, 'Transfer state changed to RESERVED_FORWARDED')
          return stateChange
        }, wrapWithRetriesConf.remainingRetries, wrapWithRetriesConf.timeout)
      } catch (err) {
        Logger.error(err)
        test.fail(err.message)
      }
      await db.disconnect()
      test.end()
    })

    notificationTest.test('consume a PREPARE message and send PUT callback on error', async test => {
      const transferId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.PREPARE,
        Action.PREPARE,
        {
          errorInformation: {
            errorCode: '3100',
            errorDescription: 'Generic validation error'
          }
        },
        Config.HUB_NAME,
        'dfsp1'
      )
      messageProtocol.metadata.event.state = {
        code: 3100,
        description: 'Generic validation error',
        status: 'error'
      }
      messageProtocol.content.uriParams = { id: transferId }

      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.PREPARE,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const response = await testNotification(messageProtocol, 'error', transferId, kafkaConfig, topicConfig)

      if (apiType === API_TYPES.iso20022) {
        test.equal(response.payload.TxInfAndSts.StsRsnInf.Rsn.Prtry, messageProtocol.content.payload.errorInformation.errorCode, 'ISO Error notification sent successfully from switch to Payer')
      } else {
        test.deepEqual(response.payload, messageProtocol.content.payload, 'Error notification sent successfully from switch to Payer')
      }

      test.end()
    })

    notificationTest.test('consume a FX_PREPARE message and send PUT callback on error', async test => {
      const commitRequestId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.PREPARE,
        Action.FX_PREPARE,
        {
          errorInformation: {
            errorCode: '3100',
            errorDescription: 'Generic validation error'
          }
        },
        Config.HUB_NAME,
        'dfsp1'
      )
      messageProtocol.metadata.event.state = {
        code: 3100,
        description: 'Generic validation error',
        status: 'error'
      }
      messageProtocol.content.uriParams = { id: commitRequestId }

      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.PREPARE,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const response = await testNotification(messageProtocol, 'error', commitRequestId, kafkaConfig, topicConfig)

      if (apiType === API_TYPES.iso20022) {
        test.equal(response.payload.TxInfAndSts.StsRsnInf.Rsn.Prtry, messageProtocol.content.payload.errorInformation.errorCode, 'ISO Error notification sent successfully from switch to Payer')
      } else {
        test.deepEqual(response.payload, messageProtocol.content.payload, 'Error notification sent successfully from switch to Payer')
      }

      test.end()
    })

    notificationTest.test('consume a PREPARE_DUPLICATE message and send PUT callback', async test => {
      const transferId = Uuid()
      const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, Enum.Kafka.Config.PRODUCER, EventTypes.TRANSFER.toUpperCase(), EventActions.PREPARE.toUpperCase())
      const messageProtocol = {
        metadata: {
          event: {
            id: Uuid(),
            createdAt: new Date(),
            type: Action.PREPARE,
            action: Action.PREPARE_DUPLICATE,
            state: {
              status: 'success',
              code: 0
            }
          }
        },
        content: {
          headers: {
            'content-length': 1038,
            'content-type': 'application/vnd.interoperability.transfers+json;version=1.1',
            date: '2017-11-02T00:00:00.000Z',
            'fspiop-destination': 'dfsp2',
            'fspiop-source': 'dfsp1'
          },
          payload: {
            amount: { amount: 100, currency: 'USD' },
            transferState: 'COMMITTED',
            completedTimestamp: '2018-08-23T21:31:00.534+01:00',
            fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
            condition: 'uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvze1',
            expiration: '2018-08-24T21:31:00.534+01:00',
            ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
            payeeFsp: 'dfsp2',
            payerFsp: 'dfsp1',
            transferId
          }
        },
        to: 'dfsp1',
        from: Config.HUB_NAME,
        id: Uuid(),
        type: 'application/json'
      }
      messageProtocol.content.context = { originalRequestPayload: messageProtocol.content.payload }

      const topicConfig = KafkaUtil.createGeneralTopicConf(GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT)

      const response = await testNotification(messageProtocol, 'put', transferId, kafkaConfig, topicConfig)
      if (apiType === API_TYPES.iso20022) {
        test.ok(response.payload.TxInfAndSts, 'ISO duplication notification sent successfully')
      } else {
        test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
      }
      test.end()
    })

    notificationTest.test('consume a FX_PREPARE_DUPLICATE message and send PUT callback', async test => {
      const commitRequestId = Uuid()
      const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, Enum.Kafka.Config.PRODUCER, EventTypes.TRANSFER.toUpperCase(), EventActions.PREPARE.toUpperCase())
      const messageProtocol = {
        metadata: {
          event: {
            id: Uuid(),
            createdAt: new Date(),
            type: Action.PREPARE,
            action: Action.FX_PREPARE_DUPLICATE,
            state: {
              status: 'success',
              code: 0
            }
          }
        },
        content: {
          headers: {
            'content-length': 1038,
            'content-type': 'application/vnd.interoperability.transfers+json;version=1.1',
            date: '2017-11-02T00:00:00.000Z',
            'fspiop-destination': 'fxp1',
            'fspiop-source': 'dfsp1'
          },
          payload: {
            commitRequestId,
            conversionState: 'COMMITTED',
            completedTimestamp: '2018-08-23T21:31:00.534+01:00'
          }
        },
        to: 'dfsp1',
        from: Config.HUB_NAME,
        id: Uuid(),
        type: 'application/json'
      }
      messageProtocol.content.context = { originalRequestPayload: messageProtocol.content.payload }

      const topicConfig = KafkaUtil.createGeneralTopicConf(GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT)

      const response = await testNotification(messageProtocol, 'put', commitRequestId, kafkaConfig, topicConfig)
      if (apiType === API_TYPES.iso20022) {
        test.ok(response.payload.TxInfAndSts, 'ISO duplication notification sent successfully')
      } else {
        test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
      }
      test.end()
    })

    notificationTest.test('consume a COMMIT message and send PUT callback', async test => {
      const transferId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        'commit',
        'commit',
        {
          amount: { amount: 100, currency: 'USD' },
          transferState: 'RESERVED',
          fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
          condition: 'uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvze1',
          expiration: '2018-08-24T21:31:00.534+01:00',
          ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
          payeeFsp: 'dfsp1',
          payerFsp: 'dfsp2',
          transferId
        },
        'dfsp1',
        'dfsp2'
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.FULFIL,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const { responseTo, responseFrom } = await testNotification(messageProtocol, 'put', transferId, kafkaConfig, topicConfig, true)

      test.deepEqual(responseFrom.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
      test.deepEqual(responseTo.payload, messageProtocol.content.payload, 'Notification sent successfully to Payee')
      test.end()
    })

    notificationTest.test('consume a FX_COMMIT message and send PUT callback to fxp and payerfsp', async test => {
      const commitRequestId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.COMMIT,
        Action.FX_COMMIT,
        {
          commitRequestId,
          initiatingFsp: 'dfsp1',
          counterPartyFsp: 'fxp1',
          sourceAmount: { amount: 100, currency: 'ZKW' },
          targetAmount: { amount: 200, currency: 'TZS' }
        },
        'dfsp1',
        'fxp1'
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.FULFIL,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const { responseTo, responseFrom } = await testNotification(messageProtocol, 'put', commitRequestId, kafkaConfig, topicConfig, true)

      test.deepEqual(responseTo.payload, messageProtocol.content.payload, 'Notification sent successfully to FXP')
      test.deepEqual(responseFrom.payload, messageProtocol.content.payload, 'Notification sent successfully to Payerfsp')
      test.end()
    })

    notificationTest.test('consume a COMMIT message and send PUT callback on error', async test => {
      const transferId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.COMMIT,
        Action.COMMIT,
        {
          errorInformation: {
            errorCode: '3000',
            errorDescription: 'Generic validation error'
          }
        },
        Config.HUB_NAME,
        'dfsp1'
      )
      messageProtocol.metadata.event.state = {
        code: 3000,
        description: 'Generic validation error',
        status: 'error'
      }
      messageProtocol.content.uriParams = { id: transferId }
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.FULFIL,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const response = await testNotification(messageProtocol, 'error', transferId, kafkaConfig, topicConfig)

      if (apiType === API_TYPES.iso20022) {
        test.equal(response.payload.TxInfAndSts.StsRsnInf.Rsn.Prtry, messageProtocol.content.payload.errorInformation.errorCode, 'ISO Error notification sent successfully to Payer')
      } else {
        test.deepEqual(response.payload, messageProtocol.content.payload, 'Error notification sent successfully to Payer')
      }

      test.end()
    })

    notificationTest.test('consume a FX_COMMIT message and send PUT callback on error', async test => {
      const commitRequestId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.COMMIT,
        Action.FX_COMMIT,
        {
          errorInformation: {
            errorCode: '3000',
            errorDescription: 'Generic validation error'
          }
        },
        Config.HUB_NAME,
        'dfsp1'
      )
      messageProtocol.metadata.event.state = {
        code: 3000,
        description: 'Generic validation error',
        status: 'error'
      }
      messageProtocol.content.uriParams = { id: commitRequestId }
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.FULFIL,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const response = await testNotification(messageProtocol, 'error', commitRequestId, kafkaConfig, topicConfig)

      if (apiType === API_TYPES.iso20022) {
        test.equal(response.payload.TxInfAndSts.StsRsnInf.Rsn.Prtry, messageProtocol.content.payload.errorInformation.errorCode, 'ISO Error notification sent successfully to Payer')
      } else {
        test.deepEqual(response.payload, messageProtocol.content.payload, 'Error notification sent successfully to Payer')
      }

      test.end()
    })

    notificationTest.test('consume a RESERVE message and send PUT callback', async test => {
      const transferId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.RESERVE,
        Action.RESERVE,
        {
          transferId,
          fulfilment: 'VFhBCqP17O5VolemGmeVeVn_ZByepYwtqBDe2F675kA',
          transferState: 'RESERVED'
        },
        'dfsp1',
        'dfsp2'
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.PREPARE,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const { responseTo, responseFrom } = await testNotification(messageProtocol, 'put', transferId, kafkaConfig, topicConfig, true, 'patch')
      if (apiType === API_TYPES.iso20022) {
        const isoPayerPayload = (await TransformFacades.FSPIOP.transfers.put({ body: messageProtocol.content.payload })).body
        const isoPayeePayload = (await TransformFacades.FSPIOP.transfers.patch({ body: messageProtocol.content.payload })).body
        test.deepEqual(responseFrom.payload.TxInfAndSts, isoPayeePayload.TxInfAndSts, 'Notification sent successfully to Payee')
        test.deepEqual(responseTo.payload.TxInfAndSts, isoPayerPayload.TxInfAndSts, 'Notification sent successfully to Payer')
      } else {
        const { fulfilment: _, ...payeePayload } = messageProtocol.content.payload
        test.deepEqual(responseFrom.payload, payeePayload, 'Notification sent successfully to Payee')
        test.deepEqual(responseTo.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
      }
      test.end()
    })

    notificationTest.test('consume a FX_RESERVE message and send PUT callback', async test => {
      const commitRequestId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.RESERVE,
        Action.FX_RESERVE,
        {
          commitRequestId,
          initiatingFsp: 'dfsp1',
          counterPartyFsp: 'fxp1'
        },
        'dfsp1',
        'fxp1'
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.FULFIL,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const { responseTo } = await testNotification(messageProtocol, 'put', commitRequestId, kafkaConfig, topicConfig, true, 'put')

      test.deepEqual(responseTo.payload, messageProtocol.content.payload, 'Notification sent successfully to FXP')
      test.end()
    })

    notificationTest.test('consume a REJECT message and send PUT callback', async test => {
      const transferId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.REJECT,
        Action.REJECT,
        {
          amount: { amount: 100, currency: 'USD' },
          transferState: 'COMMITTED',
          fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
          condition: 'uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvze1',
          expiration: '2018-08-24T21:31:00.534+01:00',
          ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
          payeeFsp: 'dfsp1',
          payerFsp: 'dfsp2',
          transferId
        },
        'dfsp1',
        'dfsp2'
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.FULFIL,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const { responseTo, responseFrom } = await testNotification(messageProtocol, 'put', transferId, kafkaConfig, topicConfig, true)

      test.deepEqual(responseFrom.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
      test.deepEqual(responseTo.payload, messageProtocol.content.payload, 'Notification sent successfully to Payee')
      test.end()
    })

    notificationTest.test('consume an FX_REJECT message and send PUT callback', async test => {
      const commitRequestId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.REJECT,
        Action.FX_REJECT,
        {
          commitRequestId,
          initiatingFsp: 'dfsp1',
          counterPartyFsp: 'fxp1',
          sourceAmount: { amount: 100, currency: 'ZKW' },
          targetAmount: { amount: 200, currency: 'TZS' }
        },
        'dfsp1',
        'fxp1'
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.PREPARE,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const { responseTo, responseFrom } = await testNotification(messageProtocol, 'put', commitRequestId, kafkaConfig, topicConfig, true)

      test.deepEqual(responseFrom.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
      test.deepEqual(responseTo.payload, messageProtocol.content.payload, 'Notification sent successfully to FXP')
      test.end()
    })

    notificationTest.test('consume a ABORT message and send PUT callback', async test => {
      const transferId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.ABORT,
        Action.ABORT,
        {
          amount: { amount: 100, currency: 'USD' },
          transferState: 'COMMITTED',
          fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
          condition: 'uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvze1',
          expiration: '2018-08-24T21:31:00.534+01:00',
          ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
          payeeFsp: 'dfsp1',
          payerFsp: 'dfsp2',
          transferId
        },
        'dfsp1',
        'dfsp2'
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.FULFIL,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)

      const { responseTo, responseFrom } = await testNotification(messageProtocol, 'error', transferId, kafkaConfig, topicConfig, true)

      test.deepEqual(responseFrom.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
      test.deepEqual(responseTo.payload, messageProtocol.content.payload, 'Notification sent successfully to Payee')
      test.end()
    })

    notificationTest.test('consume an FX_ABORT message and send PUT callback', async test => {
      const commitRequestId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.ABORT,
        Action.FX_ABORT,
        {
          commitRequestId,
          initiatingFsp: 'dfsp1',
          counterPartyFsp: 'fxp1',
          sourceAmount: { amount: 100, currency: 'ZKW' },
          targetAmount: { amount: 200, currency: 'TZS' }
        },
        'dfsp1',
        'fxp1'
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.FULFIL,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)

      const { responseTo, responseFrom } = await testNotification(messageProtocol, 'error', commitRequestId, kafkaConfig, topicConfig, true)

      test.deepEqual(responseFrom.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
      test.deepEqual(responseTo.payload, messageProtocol.content.payload, 'Notification sent successfully to FXP')
      test.end()
    })

    notificationTest.test('consume a ABORT_VALIDATION message and send PUT callback', async test => {
      const transferId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.ABORT,
        Action.ABORT_VALIDATION,
        {
          errorInformation: {
            errorCode: '3000',
            errorDescription: 'Generic validation error'
          }
        },
        'dfsp1',
        'dfsp2'
      )
      messageProtocol.content.uriParams = { id: transferId }
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.PREPARE,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)

      const { responseTo, responseFrom } = await testNotification(messageProtocol, 'error', transferId, kafkaConfig, topicConfig, true)

      if (responseTo.payload.TxInfAndSts) {
        test.equal(responseTo.payload.TxInfAndSts.StsRsnInf.Rsn.Prtry, messageProtocol.content.payload.errorInformation.errorCode, 'ISO Error notification sent successfully to Payer')
        test.equal(responseFrom.payload.TxInfAndSts.StsRsnInf.Rsn.Prtry, messageProtocol.content.payload.errorInformation.errorCode, 'ISO Error notification sent successfully to Payee')
      } else {
        test.deepEqual(responseFrom.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
        test.deepEqual(responseTo.payload, messageProtocol.content.payload, 'Notification sent successfully to Payee')
      }

      test.end()
    })

    notificationTest.test('consume a FX_ABORT_VALIDATION message and send PUT callback', async test => {
      const commitRequestId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.ABORT,
        Action.FX_ABORT_VALIDATION,
        {
          errorInformation: {
            errorCode: '3000',
            errorDescription: 'Generic validation error'
          }
        },
        'dfsp1',
        'fxp1'
      )
      messageProtocol.content.uriParams = { id: commitRequestId }
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.PREPARE,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)

      const { responseTo, responseFrom } = await testNotification(messageProtocol, 'error', commitRequestId, kafkaConfig, topicConfig, true)

      if (responseTo.payload.TxInfAndSts) {
        test.equal(responseFrom.payload.TxInfAndSts.StsRsnInf.Rsn.Prtry, messageProtocol.content.payload.errorInformation.errorCode, 'ISO Error notification sent successfully to Payer')
        test.equal(responseTo.payload.TxInfAndSts.StsRsnInf.Rsn.Prtry, messageProtocol.content.payload.errorInformation.errorCode, 'ISO Error notification sent successfully to FXP')
      } else {
        test.deepEqual(responseFrom.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
        test.deepEqual(responseTo.payload, messageProtocol.content.payload, 'Notification sent successfully to FXP')
      }

      test.end()
    })

    notificationTest.test('consume a RESERVED_ABORTED message and send PATCH callback', async test => {
      const transferId = Uuid()
      const kafkaConfig = KafkaUtil.getKafkaConfig(
        Config.KAFKA_CONFIG,
        Enum.Kafka.Config.PRODUCER,
        EventTypes.TRANSFER.toUpperCase(),
        EventActions.FULFIL.toUpperCase()
      )
      const messageProtocol = {
        metadata: {
          event: {
            id: Uuid(),
            createdAt: new Date(),
            type: Action.FULFIL,
            action: Action.RESERVED_ABORTED,
            state: {
              status: 'error',
              code: 1
            }
          }
        },
        content: {
          headers: {
            'content-length': 1038,
            'content-type': 'application/vnd.interoperability.transfers+json;version=1.1',
            date: '2021-11-02T00:00:00.000Z',
            'fspiop-destination': 'dfsp1',
            'fspiop-source': Config.HUB_NAME
          },
          payload: {
            transferId,
            completedTimestamp: '2021-05-24T08:38:08.699-04:00',
            transferState: 'ABORTED'
          }
        },
        to: 'dfsp1',
        from: Config.HUB_NAME,
        id: Uuid(),
        type: 'application/json'
      }
      // Make this different since the original request payload is not what we want sent in notification.
      messageProtocol.content.context = { originalRequestPayload: { ...messageProtocol.content.payload, transferState: 'RESERVED' } }

      const topicConfig = KafkaUtil.createGeneralTopicConf(
        GeneralTopicTemplate,
        EventTypes.NOTIFICATION,
        EventActions.EVENT
      )

      await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)

      const operation = 'patch'
      const response = await wrapWithRetries(() => getNotifications(messageProtocol.to, operation, transferId), 5, 2)
      if (apiType === API_TYPES.iso20022) {
        test.ok(response.payload)
        test.equal(response.payload.TxInfAndSts.TxSts, 'ABOR', 'ISO ABORT Error notification sent successfully to Payer')
      } else {
        test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
      }
      test.end()
    })

    notificationTest.test('consume a FX_RESERVED_ABORTED message and send PATCH callback', async test => {
      const commitRequestId = Uuid()
      const kafkaConfig = KafkaUtil.getKafkaConfig(
        Config.KAFKA_CONFIG,
        Enum.Kafka.Config.PRODUCER,
        EventTypes.TRANSFER.toUpperCase(),
        EventActions.FULFIL.toUpperCase()
      )
      const messageProtocol = {
        metadata: {
          event: {
            id: Uuid(),
            createdAt: new Date(),
            type: Action.FULFIL,
            action: Action.FX_RESERVED_ABORTED,
            state: {
              status: 'error',
              code: 1
            }
          }
        },
        content: {
          headers: {
            'content-length': 1038,
            'content-type': 'application/vnd.interoperability.transfers+json;version=1.1',
            date: '2021-11-02T00:00:00.000Z',
            'fspiop-destination': 'dfsp1',
            'fspiop-source': Config.HUB_NAME
          },
          payload: {
            commitRequestId,
            completedTimestamp: '2021-05-24T08:38:08.699-04:00',
            conversionState: 'ABORTED'
          }
        },
        to: 'dfsp1',
        from: Config.HUB_NAME,
        id: Uuid(),
        type: 'application/json'
      }
      // Make this different since the original request payload is not what we want sent in notification.
      messageProtocol.content.context = { originalRequestPayload: { ...messageProtocol.content.payload, conversionState: 'RESERVED' } }

      const topicConfig = KafkaUtil.createGeneralTopicConf(
        GeneralTopicTemplate,
        EventTypes.NOTIFICATION,
        EventActions.EVENT
      )

      await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)

      const operation = 'patch'
      const response = await wrapWithRetries(() => getNotifications(messageProtocol.to, operation, commitRequestId), 5, 2)
      if (apiType === API_TYPES.iso20022) {
        test.ok(response.payload)
        test.equal(response.payload.TxInfAndSts.TxSts, 'ABOR', 'ISO ABORT Error notification sent successfully to Payer')
      } else {
        test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
      }
      test.end()
    })

    notificationTest.test('consume a FULFIL_DUPLICATE message and send PUT callback', async test => {
      const transferId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.FULFIL,
        Action.FULFIL_DUPLICATE,
        {
          transferId,
          payerFsp: 'dfsp1',
          payeeFsp: 'dfsp2'
        },
        'dfsp1',
        'dfsp2'
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.FULFIL,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const response = await testNotification(messageProtocol, 'put', transferId, kafkaConfig, topicConfig)

      test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to Payee')
      test.end()
    })

    notificationTest.test('consume a FX_FULFIL_DUPLICATE message and send PUT callback', async test => {
      const commitRequestId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.FULFIL,
        Action.FX_FULFIL_DUPLICATE,
        {
          commitRequestId,
          initiatingFsp: 'dfsp1',
          counterPartyFsp: 'fxp1'
        },
        'dfsp1',
        'fxp1'
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.FULFIL,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const response = await testNotification(messageProtocol, 'put', commitRequestId, kafkaConfig, topicConfig)

      test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to FXP')
      test.end()
    })

    notificationTest.test('consume a ABORT_DUPLICATE message and send PUT callback', async test => {
      const transferId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.ABORT,
        Action.ABORT_DUPLICATE,
        {
          errorInformation: {
            errorCode: '3000',
            errorDescription: 'Generic validation error'
          }
        },
        Config.HUB_NAME,
        'dfsp2'
      )
      messageProtocol.content.uriParams = { id: transferId }
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.FULFIL,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)

      const response = await testNotification(messageProtocol, 'put', transferId, kafkaConfig, topicConfig)

      if (apiType === API_TYPES.iso20022) {
        test.equal(response.payload.TxInfAndSts.StsRsnInf.Rsn.Prtry, messageProtocol.content.payload.errorInformation.errorCode, 'ISO Error notification sent successfully to Payee')
      } else {
        test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to Payee')
      }

      test.end()
    })

    notificationTest.test('consume an FX_ABORT_DUPLICATE message and send PUT callback', async test => {
      const commitRequestId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.ABORT,
        Action.FX_ABORT_DUPLICATE,
        {
          errorInformation: {
            errorCode: '3000',
            errorDescription: 'Generic validation error'
          }
        },
        Config.HUB_NAME,
        'fxp1'
      )
      messageProtocol.content.uriParams = { id: commitRequestId }
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.FULFIL,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)

      const response = await testNotification(messageProtocol, 'put', commitRequestId, kafkaConfig, topicConfig)

      if (apiType === API_TYPES.iso20022) {
        test.equal(response.payload.TxInfAndSts.StsRsnInf.Rsn.Prtry, messageProtocol.content.payload.errorInformation.errorCode, 'ISO Error notification sent successfully to FXP')
      } else {
        test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to FXP')
      }

      test.end()
    })

    notificationTest.test('consume a ABORT_DUPLICATE message and send PUT error callback', async test => {
      const transferId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.ABORT,
        Action.ABORT_DUPLICATE,
        {
          errorInformation: {
            errorCode: '3000',
            errorDescription: 'Generic validation error'
          }
        },
        Config.HUB_NAME,
        'dfsp2'
      )
      messageProtocol.content.uriParams = { id: transferId }
      messageProtocol.metadata.event.state = {
        code: 3100,
        description: 'Generic validation error',
        status: 'error'
      }

      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.PREPARE,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)

      const response = await testNotification(messageProtocol, 'error', transferId, kafkaConfig, topicConfig)

      if (apiType === API_TYPES.iso20022) {
        test.equal(response.payload.TxInfAndSts.StsRsnInf.Rsn.Prtry, messageProtocol.content.payload.errorInformation.errorCode, 'ISO Error notification sent successfully to Payee')
      } else {
        test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to Payee')
      }

      test.end()
    })

    notificationTest.test('consume an FX_ABORT_DUPLICATE message and send PUT error callback', async test => {
      const commitRequestId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.ABORT,
        Action.FX_ABORT_DUPLICATE,
        {
          errorInformation: {
            errorCode: '3000',
            errorDescription: 'Generic validation error'
          }
        },
        Config.HUB_NAME,
        'fxp1'
      )
      messageProtocol.content.uriParams = { id: commitRequestId }
      messageProtocol.metadata.event.state = {
        code: 3100,
        description: 'Generic validation error',
        status: 'error'
      }
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.PREPARE,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)

      const response = await testNotification(messageProtocol, 'error', commitRequestId, kafkaConfig, topicConfig)

      if (apiType === API_TYPES.iso20022) {
        test.equal(response.payload.TxInfAndSts.StsRsnInf.Rsn.Prtry, messageProtocol.content.payload.errorInformation.errorCode, 'ISO Error notification sent successfully to FXP')
      } else {
        test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to FXP')
      }

      test.end()
    })

    notificationTest.test('consume a TIMEOUT_RECEIVED message and send PUT callback', async test => {
      const transferId = Uuid()
      const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, Enum.Kafka.Config.PRODUCER, EventTypes.TRANSFER.toUpperCase(), EventActions.PREPARE.toUpperCase())
      const messageProtocol = {
        metadata: {
          event: {
            id: Uuid(),
            createdAt: new Date(),
            type: Action.PREPARE,
            action: Action.TIMEOUT_RECEIVED,
            state: {
              status: 'success',
              code: 0
            }
          }
        },
        content: {
          headers: {
            'content-length': 1038,
            'content-type': 'application/vnd.interoperability.transfers+json;version=1.1',
            date: '2017-11-02T00:00:00.000Z',
            'fspiop-source': 'dfsp1',
            'fspiop-destination': 'dfsp2'
          },
          payload: {
            amount: { amount: 100, currency: 'USD' },
            transferState: 'COMMITTED',
            fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
            condition: 'uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvze1',
            expiration: '2018-08-24T21:31:00.534+01:00',
            ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
            payerFsp: 'dfsp1',
            payeeFsp: 'dfsp2',
            transferId
          }
        },
        from: 'dfsp1',
        to: 'dfsp2',
        id: Uuid(),
        type: 'application/json'
      }
      messageProtocol.content.context = { originalRequestPayload: messageProtocol.content.payload }

      const topicConfig = KafkaUtil.createGeneralTopicConf(GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT)

      const response = await testNotification(messageProtocol, 'error', transferId, kafkaConfig, topicConfig)

      test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to Payee')
      test.end()
    })

    notificationTest.test('consume a FX_TIMEOUT_RECEIVED message and send PUT callback', async test => {
      const commitRequestId = Uuid()
      const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, Enum.Kafka.Config.PRODUCER, EventTypes.TRANSFER.toUpperCase(), EventActions.PREPARE.toUpperCase())
      const messageProtocol = {
        metadata: {
          event: {
            id: Uuid(),
            createdAt: new Date(),
            type: Action.PREPARE,
            action: Action.FX_TIMEOUT_RECEIVED,
            state: {
              status: 'success',
              code: 0
            }
          }
        },
        content: {
          headers: {
            'content-length': 1038,
            'content-type': 'application/vnd.interoperability.transfers+json;version=1.1',
            date: '2017-11-02T00:00:00.000Z',
            'fspiop-source': 'dfsp1',
            'fspiop-destination': 'fxp1'
          },
          payload: {
            initiatingFsp: 'dfsp1',
            counterPartyFsp: 'fxp1',
            commitRequestId
          }
        },
        from: 'dfsp1',
        to: 'fxp1',
        id: Uuid(),
        type: 'application/json'
      }
      messageProtocol.content.context = { originalRequestPayload: messageProtocol.content.payload }

      const topicConfig = KafkaUtil.createGeneralTopicConf(GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT)

      const response = await testNotification(messageProtocol, 'error', commitRequestId, kafkaConfig, topicConfig)

      test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to FXP')
      test.end()
    })

    notificationTest.test('consume a TIMEOUT_RESERVED message and send PUT callback', async test => {
      const transferId = Uuid()
      const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, Enum.Kafka.Config.PRODUCER, EventTypes.TRANSFER.toUpperCase(), EventActions.PREPARE.toUpperCase())
      const messageProtocol = {
        metadata: {
          event: {
            id: Uuid(),
            createdAt: new Date(),
            type: Action.PREPARE,
            action: Action.TIMEOUT_RESERVED,
            state: {
              status: 'error',
              code: 1
            }
          }
        },
        content: {
          headers: {
            'content-length': 1038,
            'content-type': 'application/vnd.interoperability.transfers+json;version=1.1',
            date: '2017-11-02T00:00:00.000Z',
            'fspiop-source': 'dfsp1',
            'fspiop-destination': 'dfsp2'
          },
          payload: {
            errorInformation: {
              errorCode: '3000',
              errorDescription: 'Generic validation error'
            }
          },
          uriParams: { id: transferId }
        },
        from: 'dfsp1',
        to: 'dfsp2',
        id: Uuid(),
        type: 'application/json'
      }
      messageProtocol.content.context = { originalRequestPayload: messageProtocol.content.payload }

      const topicConfig = KafkaUtil.createGeneralTopicConf(GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT)

      const { responseTo, responseFrom } = await testNotification(messageProtocol, 'error', transferId, kafkaConfig, topicConfig, true)

      if (responseTo.payload.TxInfAndSts) {
        test.equal(responseFrom.payload.TxInfAndSts.StsRsnInf.Rsn.Prtry, messageProtocol.content.payload.errorInformation.errorCode, 'ISO Error notification sent successfully to Payer')
        test.equal(responseTo.payload.TxInfAndSts.StsRsnInf.Rsn.Prtry, messageProtocol.content.payload.errorInformation.errorCode, 'ISO Error notification sent successfully to Payee')
      } else {
        test.deepEqual(responseFrom.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
        test.deepEqual(responseTo.payload, messageProtocol.content.payload, 'Notification sent successfully to Payee')
      }

      test.end()
    })

    notificationTest.test('consume a FX_TIMEOUT_RESERVED message and send PUT callback', async test => {
      const commitRequestId = Uuid()
      const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, Enum.Kafka.Config.PRODUCER, EventTypes.TRANSFER.toUpperCase(), EventActions.PREPARE.toUpperCase())
      const messageProtocol = {
        metadata: {
          event: {
            id: Uuid(),
            createdAt: new Date(),
            type: Action.PREPARE,
            action: Action.FX_TIMEOUT_RESERVED,
            state: {
              status: 'error',
              code: 1
            }
          }
        },
        content: {
          headers: {
            'content-length': 1038,
            'content-type': 'application/vnd.interoperability.transfers+json;version=1.1',
            date: '2017-11-02T00:00:00.000Z',
            'fspiop-source': 'dfsp1',
            'fspiop-destination': 'fxp1'
          },
          payload: {
            errorInformation: {
              errorCode: '3000',
              errorDescription: 'Generic error'
            }
          },
          uriParams: {
            id: commitRequestId
          }
        },
        from: 'dfsp1',
        to: 'fxp1',
        id: Uuid(),
        type: 'application/json'
      }
      messageProtocol.content.context = { originalRequestPayload: messageProtocol.content.payload }

      const topicConfig = KafkaUtil.createGeneralTopicConf(GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT)

      const { responseTo, responseFrom } = await testNotification(messageProtocol, 'error', commitRequestId, kafkaConfig, topicConfig, true)

      if (responseTo.payload.TxInfAndSts) {
        test.equal(responseFrom.payload.TxInfAndSts.StsRsnInf.Rsn.Prtry, messageProtocol.content.payload.errorInformation.errorCode, 'ISO Error notification sent successfully to Payer')
        test.equal(responseTo.payload.TxInfAndSts.StsRsnInf.Rsn.Prtry, messageProtocol.content.payload.errorInformation.errorCode, 'ISO Error notification sent successfully to FXP')
      } else {
        test.deepEqual(responseFrom.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
        test.deepEqual(responseTo.payload, messageProtocol.content.payload, 'Notification sent successfully to FXP')
      }

      test.end()
    })

    notificationTest.test('consume a FORWARDED error message and send PUT callback to `to` and `from` participants', async test => {
      const transferId = Uuid()
      const kafkaConfig = KafkaUtil.getKafkaConfig(
        Config.KAFKA_CONFIG,
        Enum.Kafka.Config.PRODUCER,
        EventTypes.TRANSFER.toUpperCase(),
        EventActions.PREPARE.toUpperCase()
      )
      const messageProtocol = {
        metadata: {
          event: {
            id: Uuid(),
            createdAt: new Date(),
            type: EventTypes.NOTIFICATION,
            action: Action.FORWARDED,
            state: {
              status: 'error',
              code: 1
            }
          }
        },
        content: {
          headers: {
            'content-length': 1038,
            'content-type': 'application/vnd.interoperability.transfers+json;version=1.1',
            date: '2017-11-02T00:00:00.000Z',
            'fspiop-source': 'dfsp1',
            'fspiop-destination': 'proxyFsp'
          },
          payload: {
            errorInformation: {
              errorCode: '3000',
              errorDescription: 'Generic validation error'
            }
          },
          uriParams: { id: transferId }
        },
        from: 'dfsp1',
        to: 'proxyFsp',
        id: Uuid(),
        type: 'application/json'
      }
      messageProtocol.content.context = { originalRequestPayload: messageProtocol.content.payload }

      const topicConfig = KafkaUtil.createGeneralTopicConf(GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT)
      const { responseTo, responseFrom } = await testNotification(messageProtocol, 'error', transferId, kafkaConfig, topicConfig, true)

      if (responseTo.payload.TxInfAndSts) {
        test.equal(responseTo.payload.TxInfAndSts.StsRsnInf.Rsn.Prtry, messageProtocol.content.payload.errorInformation.errorCode, 'ISO Error notification sent successfully to dfsp1')
        test.equal(responseFrom.payload.TxInfAndSts.StsRsnInf.Rsn.Prtry, messageProtocol.content.payload.errorInformation.errorCode, 'ISO Error notification sent successfully to proxyFsp')
      } else {
        test.deepEqual(responseTo.payload, messageProtocol.content.payload, 'Notification sent successfully to dfsp1')
        test.deepEqual(responseFrom.payload, messageProtocol.content.payload, 'Notification sent successfully to proxyFsp')
      }

      test.end()
    })

    notificationTest.test('consume a GET message and send PUT callback', async test => {
      const transferId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.GET,
        Action.GET,
        {
          transferState: 'COMMITTED',
          fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
          completedTimestamp: '2021-05-24T08:38:08.699-04:00'
        },
        Config.HUB_NAME,
        'dfsp1'
      )
      messageProtocol.content.uriParams = { id: transferId }
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.GET,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const response = await testNotification(messageProtocol, 'put', transferId, kafkaConfig, topicConfig)

      if (apiType === API_TYPES.iso20022) {
        test.equal(response.payload.TxInfAndSts.TxSts, 'COMM', 'ISO message has correct status')
      } else {
        test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
      }
      test.end()
    })

    notificationTest.test('consume a FX_GET message and send PUT callback', async test => {
      const commitRequestId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.GET,
        Action.FX_GET,
        {
          conversionState: 'COMMITTED',
          fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
          completedTimestamp: '2021-05-24T08:38:08.699-04:00'
        },
        Config.HUB_NAME,
        'dfsp1'
      )
      messageProtocol.content.uriParams = { id: commitRequestId }
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.GET,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const response = await testNotification(messageProtocol, 'put', commitRequestId, kafkaConfig, topicConfig)
      if (apiType === API_TYPES.iso20022) {
        test.equal(response.payload.TxInfAndSts.TxSts, 'COMM', 'ISO message has correct status')
      } else {
        test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
      }
      test.end()
    })

    notificationTest.test('consume a GET message and send PUT error callback', async test => {
      const transferId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.GET,
        Action.GET,
        {
          errorInformation: {
            errorCode: '3000',
            errorDescription: 'Generic validation error'
          }
        },
        Config.HUB_NAME,
        'dfsp1'
      )
      messageProtocol.content.uriParams = { id: transferId }
      messageProtocol.metadata.event.state = {
        code: 3100,
        description: 'Generic validation error',
        status: 'error'
      }
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.GET,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const response = await testNotification(messageProtocol, 'error', transferId, kafkaConfig, topicConfig)

      if (apiType === API_TYPES.iso20022) {
        test.equal(response.payload.TxInfAndSts.StsRsnInf.Rsn.Prtry, messageProtocol.content.payload.errorInformation.errorCode, 'ISO Error notification sent successfully to Payer')
      } else {
        test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
      }

      test.end()
    })

    notificationTest.test('consume a FX_GET message and send PUT error callback', async test => {
      const commitRequestId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.GET,
        Action.FX_GET,
        {
          errorInformation: {
            errorCode: '3000',
            errorDescription: 'Generic validation error'
          }
        },
        Config.HUB_NAME,
        'dfsp1'
      )
      messageProtocol.content.uriParams = { id: commitRequestId }
      messageProtocol.metadata.event.state = {
        code: 3100,
        description: 'Generic validation error',
        status: 'error'
      }
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.GET,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const response = await testNotification(messageProtocol, 'error', commitRequestId, kafkaConfig, topicConfig)

      if (apiType === API_TYPES.iso20022) {
        test.equal(response.payload.TxInfAndSts.StsRsnInf.Rsn.Prtry, messageProtocol.content.payload.errorInformation.errorCode, 'ISO Error notification sent successfully to Payer')
      } else {
        test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
      }

      test.end()
    })

    notificationTest.test('consume a FX_NOTIFY message and send PATCH callback to fxp', async test => {
      const commitRequestId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        EventTypes.NOTIFICATION,
        Action.FX_NOTIFY,
        {
          commitRequestId,
          fulfilment: 'uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvze1',
          completedTimestamp: '2021-05-24T08:38:08.699-04:00'
        },
        Config.HUB_NAME,
        'fxp1'
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.FULFIL,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const response = await testNotification(messageProtocol, 'patch', commitRequestId, kafkaConfig, topicConfig)

      const payloadWithoutFulfilment = JSON.parse(JSON.stringify(messageProtocol.content.payload))
      delete payloadWithoutFulfilment.fulfilment

      test.deepEqual(response.payload, payloadWithoutFulfilment, 'Notification sent successfully to FXP')
      test.end()
    })

    notificationTest.test('consume a FX_NOTIFY message and send PATCH callback to proxied fxp', async test => {
      await proxy.addDfspIdToProxyMapping('nonExistentFxp', 'proxyFsp') // simulate proxy mapping
      const commitRequestId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        EventTypes.NOTIFICATION,
        Action.FX_NOTIFY,
        {
          commitRequestId,
          fulfilment: 'uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvze1',
          completedTimestamp: '2021-05-24T08:38:08.699-04:00'
        },
        Config.HUB_NAME,
        'nonExistentFxp'
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.FULFIL,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const response = await testNotification(messageProtocol, 'patch', commitRequestId, kafkaConfig, topicConfig, undefined, undefined, 'proxyFsp')

      const payloadWithoutFulfilment = JSON.parse(JSON.stringify(messageProtocol.content.payload))
      delete payloadWithoutFulfilment.fulfilment
      test.deepEqual(response.payload, payloadWithoutFulfilment, 'Notification sent successfully to FXP')
      test.end()
    })

    notificationTest.test('should read originalRequestPayload from payload cache and send to recipient', async test => {
      if (apiType !== API_TYPES.iso20022 || originalPayloadStorage !== PAYLOAD_STORAGES.redis) {
        test.pass('Skipping test for non-ISO20022 API')
        test.end()
        return
      }

      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.FULFIL,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.PREPARE,
        Action.PREPARE,
        {
          transferId: Uuid(),
          payerFsp: 'dfsp1',
          payeeFsp: 'dfsp2'
        },
        'dfsp1',
        'dfsp2'
      )
      delete messageProtocol.content.context.originalRequestPayload
      const originalRequestPayload = { ...messageProtocol.content.payload, payloadFromRedis: true }
      const originalRequestId = Uuid()
      messageProtocol.content.context.originalRequestId = originalRequestId
      const operation = 'post'
      const transferId = messageProtocol.content.payload.transferId

      const payloadCache = createPayloadCache(Config.PAYLOAD_CACHE.type, Config.PAYLOAD_CACHE.connectionConfig)
      await payloadCache.connect()
      await payloadCache.setPayload(originalRequestId, originalRequestPayload)

      await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)

      let response = await getNotifications(messageProtocol.to, operation, transferId)

      let currentAttempts = 0
      while (!response && currentAttempts < (timeoutAttempts * callbackWaitSeconds)) {
        sleep(callbackWaitSeconds)
        response = response || await getNotifications(messageProtocol.to, operation, transferId)
        currentAttempts++
      }

      // Assert
      test.ok(response, 'Notification sent successfully to Payee')
      test.deepEqual(response.payload, originalRequestPayload, 'Notification read successfully from payload cache and sent to Payee')

      await payloadCache.disconnect()

      test.end()
    })

    notificationTest.test('tear down', async test => {
      await proxy.disconnect()
      await db.disconnect()
      try {
        await Kafka.Producer.disconnect()
      } catch (err) { /* ignore error */ }
      test.end()
    })

    notificationTest.end()
  })
  notificationHandlerTest.end()
})

function sleep (seconds) {
  const waitUntil = new Date().getTime() + seconds * 1000
  Logger.debug(`Sleep helper - waiting ${waitUntil}`)
  while (new Date().getTime() < waitUntil) {
    Logger.debug('.')
  }
}

const getNotifications = async (fsp, operation, id) => {
  try {
    const url = `${getNotificationUrl}/${fsp}/${operation}/${id}`
    Logger.debug(`getNotifications: ${url}`)
    const response = await Request.sendRequest({
      url,
      headers: Fixtures.buildHeaders,
      source: Config.HUB_NAME,
      destination: Config.HUB_NAME,
      hubNameRegex
    })
    return response.data
  } catch (error) {
    Logger.error(error)
    throw error
  }
}

const wrapWithRetries = async (func, remainingRetries, timeout) => {
  try {
    const result = await func()
    if (!result) {
      throw new Error('result is undefined')
    }
    return result
  } catch (err) {
    if (remainingRetries === 0) {
      throw err
    }

    await sleep(2)
    return wrapWithRetries(func, remainingRetries - 1, timeout)
  }
}
