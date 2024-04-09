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
 * Shashikant Hirugade <shashikant.hirugade@modusbox.com>
 * Miguel de Barros <miguel.debarros@modusbox.com>

 --------------
 ******/
'use strict'

const Test = require('tapes')(require('tape'))
const Uuid = require('uuid4')
const Config = require('../../../../src/lib/config')
const KafkaUtil = require('@mojaloop/central-services-shared').Util.Kafka
const Kafka = require('@mojaloop/central-services-stream').Util
const Request = require('@mojaloop/central-services-shared').Util.Request
const Enum = require('@mojaloop/central-services-shared').Enum
const { Action } = Enum.Events.Event
const Fixtures = require('../../../fixtures/index')
const Logger = require('@mojaloop/central-services-logger')

const EventTypes = Enum.Events.Event.Type
const EventActions = Enum.Events.Event.Action
const GeneralTopicTemplate = Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE

const timeoutAttempts = 10
const callbackWaitSeconds = 2

const getNotificationUrl = process.env.ENDPOINT_URL

const testNotification = async (messageProtocol, operation, transferId, kafkaConfig, topicConfig, checkSenderResponse = false) => {
  await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)

  let response = await getNotifications(messageProtocol.to, operation, transferId)
  let responseFrom = checkSenderResponse ? await getNotifications(messageProtocol.from, operation, transferId) : true

  let currentAttempts = 0
  while (!(response && responseFrom) && currentAttempts < (timeoutAttempts * callbackWaitSeconds)) {
    sleep(callbackWaitSeconds)
    response = await getNotifications(messageProtocol.to, operation, transferId)
    responseFrom = checkSenderResponse && await getNotifications(messageProtocol.from, operation, transferId)
    currentAttempts++
  }
  return checkSenderResponse ? { responseTo: response, responseFrom } : response
}

Test('Notification Handler', notificationHandlerTest => {
  notificationHandlerTest.test('should', async notificationTest => {
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
          ilpPacket: 'AQAAAAAAAABkEGcuZXdwMjEuaWQuODAwMjCCAhd7InRyYW5zYWN0aW9uSWQiOiJmODU0NzdkYi0xMzVkLTRlMDgtYThiNy0xMmIyMmQ4MmMwZDYiLCJxdW90ZUlkIjoiOWU2NGYzMjEtYzMyNC00ZDI0LTg5MmYtYzQ3ZWY0ZThkZTkxIiwicGF5ZWUiOnsicGFydHlJZEluZm8iOnsicGFydHlJZFR5cGUiOiJNU0lTRE4iLCJwYXJ0eUlkZW50aWZpZXIiOiIyNTYxMjM0NTYiLCJmc3BJZCI6IjIxIn19LCJwYXllciI6eyJwYXJ0eUlkSW5mbyI6eyJwYXJ0eUlkVHlwZSI6Ik1TSVNETiIsInBhcnR5SWRlbnRpZmllciI6IjI1NjIwMTAwMDAxIiwiZnNwSWQiOiIyMCJ9LCJwZXJzb25hbEluZm8iOnsiY29tcGxleE5hbWUiOnsiZmlyc3ROYW1lIjoiTWF0cyIsImxhc3ROYW1lIjoiSGFnbWFuIn0sImRhdGVPZkJpcnRoIjoiMTk4My0xMC0yNSJ9fSwiYW1vdW50Ijp7ImFtb3VudCI6IjEwMCIsImN1cnJlbmN5IjoiVVNEIn0sInRyYW5zYWN0aW9uVHlwZSI6eyJzY2VuYXJpbyI6IlRSQU5TRkVSIiwiaW5pdGlhdG9yIjoiUEFZRVIiLCJpbml0aWF0b3JUeXBlIjoiQ09OU1VNRVIifSwibm90ZSI6ImhlaiJ9',
          payeeFsp: 'dfsp1',
          payerFsp: 'dfsp2',
          transferId
        },
        'dfsp1',
        'dfsp2'
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.PREPARE,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const response = await testNotification(messageProtocol, 'post', transferId, kafkaConfig, topicConfig)

      test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to Payee')
      test.end()
    })

    notificationTest.test('consume a FX_PREPARE message and send POST callback', async test => {
      const transferId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.PREPARE,
        Action.FX_PREPARE,
        {
          commitRequestId: transferId,
          determiningTransferId: Uuid(),
          initiatingFsp: 'dfsp1',
          counterPartyFsp: 'fxp1',
          amountType: 'SEND',
          sourceAmount: { amount: 100, currency: 'KWS' },
          targetAmount: { amount: 200, currency: 'TZS' },
          condition: 'uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvze1',
          expiration: '2018-08-24T21:31:00.534+01:00',
          ilpPacket: 'AQAAAAAAAABkEGcuZXdwMjEuaWQuODAwMjCCAhd7InRyYW5zYWN0aW9uSWQiOiJmODU0NzdkYi0xMzVkLTRlMDgtYThiNy0xMmIyMmQ4MmMwZDYiLCJxdW90ZUlkIjoiOWU2NGYzMjEtYzMyNC00ZDI0LTg5MmYtYzQ3ZWY0ZThkZTkxIiwicGF5ZWUiOnsicGFydHlJZEluZm8iOnsicGFydHlJZFR5cGUiOiJNU0lTRE4iLCJwYXJ0eUlkZW50aWZpZXIiOiIyNTYxMjM0NTYiLCJmc3BJZCI6IjIxIn19LCJwYXllciI6eyJwYXJ0eUlkSW5mbyI6eyJwYXJ0eUlkVHlwZSI6Ik1TSVNETiIsInBhcnR5SWRlbnRpZmllciI6IjI1NjIwMTAwMDAxIiwiZnNwSWQiOiIyMCJ9LCJwZXJzb25hbEluZm8iOnsiY29tcGxleE5hbWUiOnsiZmlyc3ROYW1lIjoiTWF0cyIsImxhc3ROYW1lIjoiSGFnbWFuIn0sImRhdGVPZkJpcnRoIjoiMTk4My0xMC0yNSJ9fSwiYW1vdW50Ijp7ImFtb3VudCI6IjEwMCIsImN1cnJlbmN5IjoiVVNEIn0sInRyYW5zYWN0aW9uVHlwZSI6eyJzY2VuYXJpbyI6IlRSQU5TRkVSIiwiaW5pdGlhdG9yIjoiUEFZRVIiLCJpbml0aWF0b3JUeXBlIjoiQ09OU1VNRVIifSwibm90ZSI6ImhlaiJ9'
        },
        'dfsp1',
        'fxp1'
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.PREPARE,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const response = await testNotification(messageProtocol, 'post', transferId, kafkaConfig, topicConfig)

      test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to FXP')
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
        'switch',
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

      test.deepEqual(response.payload, messageProtocol.content.payload, 'Error notification sent successfully from switch to Payer')
      test.end()
    })

    notificationTest.test('consume a FX_PREPARE message and send PUT callback on error', async test => {
      const transferId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.PREPARE,
        Action.FX_PREPARE,
        {
          errorInformation: {
            errorCode: '3100',
            errorDescription: 'Generic validation error'
          }
        },
        'switch',
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

      test.deepEqual(response.payload, messageProtocol.content.payload, 'Error notification sent successfully from switch to Payer')
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
          ilpPacket: 'AQAAAAAAAABkEGcuZXdwMjEuaWQuODAwMjCCAhd7InRyYW5zYWN0aW9uSWQiOiJmODU0NzdkYi0xMzVkLTRlMDgtYThiNy0xMmIyMmQ4MmMwZDYiLCJxdW90ZUlkIjoiOWU2NGYzMjEtYzMyNC00ZDI0LTg5MmYtYzQ3ZWY0ZThkZTkxIiwicGF5ZWUiOnsicGFydHlJZEluZm8iOnsicGFydHlJZFR5cGUiOiJNU0lTRE4iLCJwYXJ0eUlkZW50aWZpZXIiOiIyNTYxMjM0NTYiLCJmc3BJZCI6IjIxIn19LCJwYXllciI6eyJwYXJ0eUlkSW5mbyI6eyJwYXJ0eUlkVHlwZSI6Ik1TSVNETiIsInBhcnR5SWRlbnRpZmllciI6IjI1NjIwMTAwMDAxIiwiZnNwSWQiOiIyMCJ9LCJwZXJzb25hbEluZm8iOnsiY29tcGxleE5hbWUiOnsiZmlyc3ROYW1lIjoiTWF0cyIsImxhc3ROYW1lIjoiSGFnbWFuIn0sImRhdGVPZkJpcnRoIjoiMTk4My0xMC0yNSJ9fSwiYW1vdW50Ijp7ImFtb3VudCI6IjEwMCIsImN1cnJlbmN5IjoiVVNEIn0sInRyYW5zYWN0aW9uVHlwZSI6eyJzY2VuYXJpbyI6IlRSQU5TRkVSIiwiaW5pdGlhdG9yIjoiUEFZRVIiLCJpbml0aWF0b3JUeXBlIjoiQ09OU1VNRVIifSwibm90ZSI6ImhlaiJ9',
          payeeFsp: 'dfsp1',
          payerFsp: 'dfsp2',
          transferId
        },
        'dfsp1',
        'dfsp2'
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.PREPARE,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const { responseTo, responseFrom } = await testNotification(messageProtocol, 'put', transferId, kafkaConfig, topicConfig, true)

      test.deepEqual(responseFrom.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
      test.deepEqual(responseTo.payload, messageProtocol.content.payload, 'Notification sent successfully to Payee')
      test.end()
    })

    notificationTest.test('consume a FX_COMMIT message and send PUT callback', async test => {
      const transferId = Uuid()
      const messageProtocol = Fixtures.createMessageProtocol(
        Action.COMMIT,
        Action.COMMIT,
        {
          amount: { amount: 100, currency: 'USD' },
          transferState: 'RESERVED',
          fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
          condition: 'uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvze1',
          expiration: '2018-08-24T21:31:00.534+01:00',
          ilpPacket: 'AQAAAAAAAABkEGcuZXdwMjEuaWQuODAwMjCCAhd7InRyYW5zYWN0aW9uSWQiOiJmODU0NzdkYi0xMzVkLTRlMDgtYThiNy0xMmIyMmQ4MmMwZDYiLCJxdW90ZUlkIjoiOWU2NGYzMjEtYzMyNC00ZDI0LTg5MmYtYzQ3ZWY0ZThkZTkxIiwicGF5ZWUiOnsicGFydHlJZEluZm8iOnsicGFydHlJZFR5cGUiOiJNU0lTRE4iLCJwYXJ0eUlkZW50aWZpZXIiOiIyNTYxMjM0NTYiLCJmc3BJZCI6IjIxIn19LCJwYXllciI6eyJwYXJ0eUlkSW5mbyI6eyJwYXJ0eUlkVHlwZSI6Ik1TSVNETiIsInBhcnR5SWRlbnRpZmllciI6IjI1NjIwMTAwMDAxIiwiZnNwSWQiOiIyMCJ9LCJwZXJzb25hbEluZm8iOnsiY29tcGxleE5hbWUiOnsiZmlyc3ROYW1lIjoiTWF0cyIsImxhc3ROYW1lIjoiSGFnbWFuIn0sImRhdGVPZkJpcnRoIjoiMTk4My0xMC0yNSJ9fSwiYW1vdW50Ijp7ImFtb3VudCI6IjEwMCIsImN1cnJlbmN5IjoiVVNEIn0sInRyYW5zYWN0aW9uVHlwZSI6eyJzY2VuYXJpbyI6IlRSQU5TRkVSIiwiaW5pdGlhdG9yIjoiUEFZRVIiLCJpbml0aWF0b3JUeXBlIjoiQ09OU1VNRVIifSwibm90ZSI6ImhlaiJ9',
          payeeFsp: 'dfsp1',
          payerFsp: 'dfsp2',
          transferId
        },
        'dfsp1',
        'dfsp2'
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.PREPARE,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const { responseTo, responseFrom } = await testNotification(messageProtocol, 'put', transferId, kafkaConfig, topicConfig, true)

      test.deepEqual(responseFrom.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
      test.deepEqual(responseTo.payload, messageProtocol.content.payload, 'Notification sent successfully to Payee')
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
        'dfsp2',
        'dfsp1'
      )
      messageProtocol.metadata.event.state = {
        code: 3000,
        description: 'Generic validation error',
        status: 'error'
      }
      messageProtocol.content.uriParams = { id: transferId }
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.PREPARE,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const response = await testNotification(messageProtocol, 'error', transferId, kafkaConfig, topicConfig)

      test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
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
          ilpPacket: 'AQAAAAAAAABkEGcuZXdwMjEuaWQuODAwMjCCAhd7InRyYW5zYWN0aW9uSWQiOiJmODU0NzdkYi0xMzVkLTRlMDgtYThiNy0xMmIyMmQ4MmMwZDYiLCJxdW90ZUlkIjoiOWU2NGYzMjEtYzMyNC00ZDI0LTg5MmYtYzQ3ZWY0ZThkZTkxIiwicGF5ZWUiOnsicGFydHlJZEluZm8iOnsicGFydHlJZFR5cGUiOiJNU0lTRE4iLCJwYXJ0eUlkZW50aWZpZXIiOiIyNTYxMjM0NTYiLCJmc3BJZCI6IjIxIn19LCJwYXllciI6eyJwYXJ0eUlkSW5mbyI6eyJwYXJ0eUlkVHlwZSI6Ik1TSVNETiIsInBhcnR5SWRlbnRpZmllciI6IjI1NjIwMTAwMDAxIiwiZnNwSWQiOiIyMCJ9LCJwZXJzb25hbEluZm8iOnsiY29tcGxleE5hbWUiOnsiZmlyc3ROYW1lIjoiTWF0cyIsImxhc3ROYW1lIjoiSGFnbWFuIn0sImRhdGVPZkJpcnRoIjoiMTk4My0xMC0yNSJ9fSwiYW1vdW50Ijp7ImFtb3VudCI6IjEwMCIsImN1cnJlbmN5IjoiVVNEIn0sInRyYW5zYWN0aW9uVHlwZSI6eyJzY2VuYXJpbyI6IlRSQU5TRkVSIiwiaW5pdGlhdG9yIjoiUEFZRVIiLCJpbml0aWF0b3JUeXBlIjoiQ09OU1VNRVIifSwibm90ZSI6ImhlaiJ9',
          payeeFsp: 'dfsp1',
          payerFsp: 'dfsp2',
          transferId
        },
        'dfsp1',
        'dfsp2'
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.PREPARE,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      const { responseTo, responseFrom } = await testNotification(messageProtocol, 'put', transferId, kafkaConfig, topicConfig, true)

      test.deepEqual(responseFrom.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
      test.deepEqual(responseTo.payload, messageProtocol.content.payload, 'Notification sent successfully to Payee')
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
          ilpPacket: 'AQAAAAAAAABkEGcuZXdwMjEuaWQuODAwMjCCAhd7InRyYW5zYWN0aW9uSWQiOiJmODU0NzdkYi0xMzVkLTRlMDgtYThiNy0xMmIyMmQ4MmMwZDYiLCJxdW90ZUlkIjoiOWU2NGYzMjEtYzMyNC00ZDI0LTg5MmYtYzQ3ZWY0ZThkZTkxIiwicGF5ZWUiOnsicGFydHlJZEluZm8iOnsicGFydHlJZFR5cGUiOiJNU0lTRE4iLCJwYXJ0eUlkZW50aWZpZXIiOiIyNTYxMjM0NTYiLCJmc3BJZCI6IjIxIn19LCJwYXllciI6eyJwYXJ0eUlkSW5mbyI6eyJwYXJ0eUlkVHlwZSI6Ik1TSVNETiIsInBhcnR5SWRlbnRpZmllciI6IjI1NjIwMTAwMDAxIiwiZnNwSWQiOiIyMCJ9LCJwZXJzb25hbEluZm8iOnsiY29tcGxleE5hbWUiOnsiZmlyc3ROYW1lIjoiTWF0cyIsImxhc3ROYW1lIjoiSGFnbWFuIn0sImRhdGVPZkJpcnRoIjoiMTk4My0xMC0yNSJ9fSwiYW1vdW50Ijp7ImFtb3VudCI6IjEwMCIsImN1cnJlbmN5IjoiVVNEIn0sInRyYW5zYWN0aW9uVHlwZSI6eyJzY2VuYXJpbyI6IlRSQU5TRkVSIiwiaW5pdGlhdG9yIjoiUEFZRVIiLCJpbml0aWF0b3JUeXBlIjoiQ09OU1VNRVIifSwibm90ZSI6ImhlaiJ9',
          payeeFsp: 'dfsp1',
          payerFsp: 'dfsp2',
          transferId
        },
        'dfsp1',
        'dfsp2'
      )
      const { kafkaConfig, topicConfig } = Fixtures.createProducerConfig(
        Config.KAFKA_CONFIG, EventTypes.TRANSFER, EventActions.PREPARE,
        GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT
      )

      await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)

      const { responseTo, responseFrom } = await testNotification(messageProtocol, 'error', transferId, kafkaConfig, topicConfig, true)

      test.deepEqual(responseFrom.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
      test.deepEqual(responseTo.payload, messageProtocol.content.payload, 'Notification sent successfully to Payee')
      test.end()
    })

    notificationTest.test('consume a TIMEOUT-RECEIVED message and send PUT callback', async test => {
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
            ilpPacket: 'AQAAAAAAAABkEGcuZXdwMjEuaWQuODAwMjCCAhd7InRyYW5zYWN0aW9uSWQiOiJmODU0NzdkYi0xMzVkLTRlMDgtYThiNy0xMmIyMmQ4MmMwZDYiLCJxdW90ZUlkIjoiOWU2NGYzMjEtYzMyNC00ZDI0LTg5MmYtYzQ3ZWY0ZThkZTkxIiwicGF5ZWUiOnsicGFydHlJZEluZm8iOnsicGFydHlJZFR5cGUiOiJNU0lTRE4iLCJwYXJ0eUlkZW50aWZpZXIiOiIyNTYxMjM0NTYiLCJmc3BJZCI6IjIxIn19LCJwYXllciI6eyJwYXJ0eUlkSW5mbyI6eyJwYXJ0eUlkVHlwZSI6Ik1TSVNETiIsInBhcnR5SWRlbnRpZmllciI6IjI1NjIwMTAwMDAxIiwiZnNwSWQiOiIyMCJ9LCJwZXJzb25hbEluZm8iOnsiY29tcGxleE5hbWUiOnsiZmlyc3ROYW1lIjoiTWF0cyIsImxhc3ROYW1lIjoiSGFnbWFuIn0sImRhdGVPZkJpcnRoIjoiMTk4My0xMC0yNSJ9fSwiYW1vdW50Ijp7ImFtb3VudCI6IjEwMCIsImN1cnJlbmN5IjoiVVNEIn0sInRyYW5zYWN0aW9uVHlwZSI6eyJzY2VuYXJpbyI6IlRSQU5TRkVSIiwiaW5pdGlhdG9yIjoiUEFZRVIiLCJpbml0aWF0b3JUeXBlIjoiQ09OU1VNRVIifSwibm90ZSI6ImhlaiJ9',
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

      const topicConfig = KafkaUtil.createGeneralTopicConf(GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT)

      const response = await testNotification(messageProtocol, 'error', transferId, kafkaConfig, topicConfig)

      test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to Payee')
      test.end()
    })

    notificationTest.test('consume a PREPARE-DUPLICATE message and send PUT callback', async test => {
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
            ilpPacket: 'AQAAAAAAAABkEGcuZXdwMjEuaWQuODAwMjCCAhd7InRyYW5zYWN0aW9uSWQiOiJmODU0NzdkYi0xMzVkLTRlMDgtYThiNy0xMmIyMmQ4MmMwZDYiLCJxdW90ZUlkIjoiOWU2NGYzMjEtYzMyNC00ZDI0LTg5MmYtYzQ3ZWY0ZThkZTkxIiwicGF5ZWUiOnsicGFydHlJZEluZm8iOnsicGFydHlJZFR5cGUiOiJNU0lTRE4iLCJwYXJ0eUlkZW50aWZpZXIiOiIyNTYxMjM0NTYiLCJmc3BJZCI6IjIxIn19LCJwYXllciI6eyJwYXJ0eUlkSW5mbyI6eyJwYXJ0eUlkVHlwZSI6Ik1TSVNETiIsInBhcnR5SWRlbnRpZmllciI6IjI1NjIwMTAwMDAxIiwiZnNwSWQiOiIyMCJ9LCJwZXJzb25hbEluZm8iOnsiY29tcGxleE5hbWUiOnsiZmlyc3ROYW1lIjoiTWF0cyIsImxhc3ROYW1lIjoiSGFnbWFuIn0sImRhdGVPZkJpcnRoIjoiMTk4My0xMC0yNSJ9fSwiYW1vdW50Ijp7ImFtb3VudCI6IjEwMCIsImN1cnJlbmN5IjoiVVNEIn0sInRyYW5zYWN0aW9uVHlwZSI6eyJzY2VuYXJpbyI6IlRSQU5TRkVSIiwiaW5pdGlhdG9yIjoiUEFZRVIiLCJpbml0aWF0b3JUeXBlIjoiQ09OU1VNRVIifSwibm90ZSI6ImhlaiJ9',
            payeeFsp: 'dfsp2',
            payerFsp: 'dfsp1',
            transferId
          }
        },
        to: 'dfsp1',
        from: 'switch',
        id: Uuid(),
        type: 'application/json'
      }

      const topicConfig = KafkaUtil.createGeneralTopicConf(GeneralTopicTemplate, EventTypes.NOTIFICATION, EventActions.EVENT)

      const response = await testNotification(messageProtocol, 'put', transferId, kafkaConfig, topicConfig)

      test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
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
            'FSPIOP-Destination': 'dfsp1',
            'FSPIOP-Source': 'switch'
          },
          payload: {
            // TODO: should we have the transferId here?
            transferId,
            completedTimestamp: '2021-05-24T08:38:08.699-04:00',
            transferState: 'ABORTED'
          }
        },
        to: 'dfsp1',
        from: 'switch',
        id: Uuid(),
        type: 'application/json'
      }

      const topicConfig = KafkaUtil.createGeneralTopicConf(
        GeneralTopicTemplate,
        EventTypes.NOTIFICATION,
        EventActions.EVENT
      )

      await Kafka.Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)

      const operation = 'patch'
      const response = await wrapWithRetries(() => getNotifications(messageProtocol.to, operation, transferId), 5, 2)
      test.deepEqual(response.payload, messageProtocol.content.payload, 'Notification sent successfully to Payer')
      test.end()
    })

    notificationTest.test('tear down', async test => {
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
    const response = await Request.sendRequest(
      url,
      Fixtures.buildHeaders,
      Enum.Http.Headers.FSPIOP.SWITCH.value,
      Enum.Http.Headers.FSPIOP.SWITCH.value
    )
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
