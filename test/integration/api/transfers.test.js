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

const Test = require('tape')
const Ilp = require('@mojaloop/sdk-standard-components').Ilp
const Logger = require('@mojaloop/central-services-logger')
const EventSdk = require('@mojaloop/event-sdk')
const { Hapi } = require('@mojaloop/central-services-shared').Util
const Utility = require('@mojaloop/central-services-shared').Util.Kafka
const Enum = require('@mojaloop/central-services-shared').Enum
const Kafka = require('@mojaloop/central-services-stream').Util

const Config = require('../../../src/lib/config')
const Handler = require('../../../src/api/transfers/handler')
const {
  buildISOTransfer,
  buildISOFulfil,
  buildISOTransferError,
  buildISOFxTransfer,
  buildISOFxFulfil,
  buildISOFxTransferError
} = require('../../fixtures')
const uuid4 = require('uuid4')
const { initializeProducers } = require('../../../src/shared/setup')
const { wrapWithRetries } = require('../../helpers/general')
const TestConsumer = require('../helpers/testConsumer')

const rebalanceDelay = process?.env?.TEST_INT_REBALANCE_DELAY || 20000
const retryDelay = process?.env?.TEST_INT_RETRY_DELAY || 2
const retryCount = process?.env?.TEST_INT_RETRY_COUNT || 40
const retryOpts = {
  retries: retryCount,
  minTimeout: retryDelay,
  maxTimeout: retryDelay
}

const testKafkaConsumerConfig = {
  TRANSFER: {
    PREPARE: {
      config: {
        options: {
          mode: 2,
          batchSize: 1,
          pollFrequency: 10,
          recursiveTimeout: 100,
          messageCharset: 'utf8',
          messageAsJSON: true,
          sync: true,
          consumeTimeout: 1000
        },
        rdkafkaConf: {
          'client.id': 'cl-con-transfer-prepare',
          'group.id': 'cl-group-transfer-prepare',
          'metadata.broker.list': 'localhost:9092',
          'socket.keepalive.enable': true,
          'allow.auto.create.topics': true
        },
        topicConf: {
          'auto.offset.reset': 'earliest'
        }
      }
    },
    FULFIL: {
      config: {
        options: {
          mode: 2,
          batchSize: 1,
          pollFrequency: 10,
          recursiveTimeout: 100,
          messageCharset: 'utf8',
          messageAsJSON: true,
          sync: true,
          consumeTimeout: 1000
        },
        rdkafkaConf: {
          'client.id': 'cl-con-transfer-fulfil',
          'group.id': 'cl-group-transfer-fulfil',
          'metadata.broker.list': 'localhost:9092',
          'socket.keepalive.enable': true,
          'allow.auto.create.topics': true
        },
        topicConf: {
          'auto.offset.reset': 'earliest'
        }
      }
    }
  }
}

const testConsumer = new TestConsumer([
  {
    topicName: Utility.transformGeneralTopicName(
      Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE,
      Enum.Events.Event.Type.TRANSFER,
      Enum.Events.Event.Action.FULFIL
    ),
    config: testKafkaConsumerConfig.TRANSFER.FULFIL.config
  },
  {
    topicName: Utility.transformGeneralTopicName(
      Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE,
      Enum.Events.Event.Type.TRANSFER,
      Enum.Events.Event.Action.PREPARE
    ),
    config: testKafkaConsumerConfig.TRANSFER.PREPARE.config
  }
])

const createISORequest = async (payload, headers, participants) => {
  const requestPayload = payload || {}
  return {
    headers: {
      'fspiop-source': 'dfsp1',
      'fspiop-destination': 'dfsp2',
      'content-type': 'application/vnd.interoperability.iso20022.transfers+json;version=2.0',
      accept: 'application/vnd.interoperability.iso20022.transfers+json;version=2',
      ...headers
    },
    payload: requestPayload,
    server: {
      log: () => { }
    },
    span: EventSdk.Tracer.createSpan('test_span'),
    dataUri: 'someDataUri',
    info: {
      id: uuid4()
    }
  }
}

const createFxISORequest = async (payload, headers) => {
  const isoRequest = await createISORequest(payload, headers)
  return {
    ...isoRequest,
    path: '/fxTransfers'
  }
}

Test('ISO transfer handler', async (handlerTest) => {
  const wrapWithRetriesConf = {
    remainingRetries: retryOpts?.retries || 10, // default 10
    timeout: retryOpts?.maxTimeout || 2 // default 2
  }

  const createTestReply = (test, expectedCode = 202) => ({
    response: () => ({
      code: statusCode => {
        test.equal(statusCode, expectedCode)
      }
    })
  })

  await handlerTest.test('registerAllHandlers should', async registerAllHandlers => {
    await registerAllHandlers.test('setup', async (test) => {
      try {
        Config.API_TYPE = Hapi.API_TYPES.iso20022
        await initializeProducers()
        await testConsumer.startListening()

        await new Promise(resolve => setTimeout(resolve, rebalanceDelay))
        testConsumer.clearEvents()

        test.pass('done')
        test.end()
      } catch (err) {
        Logger.error(`Setup for test failed with error - ${err}`)
        test.fail()
        test.end()
      }
    })
    registerAllHandlers.end()
  })

  await handlerTest.test('create', async (createTransferTest) => {
    await createTransferTest.test('reply with status code 202 if ISO message is sent successfully to kafka', async test => {
      const transferId = '12345'
      const payload = await buildISOTransfer(transferId, {}, Ilp.ILP_VERSIONS.v4)
      const request = await createISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.transfers+json;version=2.0'
        }
      )
      const reply = createTestReply(test)

      await Handler.create({}, request, reply)
      try {
        const transferPrepare = await wrapWithRetries(() => testConsumer.getEventsForFilter({
          topicFilter: 'topic-transfer-prepare',
          action: 'prepare'
        }), wrapWithRetriesConf.remainingRetries, wrapWithRetriesConf.timeout)
        test.ok(transferPrepare[0], 'Prepare message with key found')
        const { content } = transferPrepare[0].value
        test.ok(content.payload.transferId, 'TransferId is present in the message')
        test.equal(content.context.originalRequestId, request.info.id, 'Original request id matches')
        test.equal(content.context.originalRequestPayload, request.dataUri, 'Original request payload is plugin dataUri')
      } catch (err) {
        test.notOk('Error should not be thrown')
        console.error(err)
      }

      test.end()
    })

    createTransferTest.end()
  })

  await handlerTest.test('transfers - fulfilTransfer should', async fulfilTransferTest => {
    fulfilTransferTest.test('reply with status code 200 if ISO message is sent successfully to kafka', async test => {
      const transferId = '12345'
      const payload = await buildISOFulfil(transferId)
      const request = await createISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.transfers+json;version=2.0'
        }
      )
      request.params = { id: transferId }
      const reply = createTestReply(test, 200)

      await Handler.fulfilTransfer({}, request, reply)
      try {
        const transferFulfil = await wrapWithRetries(() => testConsumer.getEventsForFilter({
          topicFilter: 'topic-transfer-fulfil',
          action: 'reserve'
        }), wrapWithRetriesConf.remainingRetries, wrapWithRetriesConf.timeout)
        test.ok(transferFulfil[0], 'Fulfil message with key found')
        const { content } = transferFulfil[0].value
        test.ok(content.payload.fulfilment, 'Fulfilment is present in the message')
        test.equal(content.context.originalRequestId, request.info.id, 'Original request id matches')
        test.equal(content.context.originalRequestPayload, request.dataUri, 'Original request payload is plugin dataUri')
      } catch (err) {
        test.notOk('Error should not be thrown')
        console.error(err)
      }

      test.end()
    })

    fulfilTransferTest.end()
  })

  await handlerTest.test('transfers - transferError should', async transferErrorTest => {
    await transferErrorTest.test('reply with status code 200 if ISO error message is sent successfully to kafka', async test => {
      const transferId = '12345'
      const payload = await buildISOTransferError()
      const request = await createISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.transfers+json;version=2.0'
        }
      )
      request.params = { id: transferId }
      const reply = createTestReply(test, 200)

      await Handler.fulfilTransferError({}, request, reply)
      try {
        const transferFulfil = await wrapWithRetries(() => testConsumer.getEventsForFilter({
          topicFilter: 'topic-transfer-fulfil',
          action: 'abort'
        }), wrapWithRetriesConf.remainingRetries, wrapWithRetriesConf.timeout)
        test.ok(transferFulfil[0], 'Fulfil message with key found')
        const { content } = transferFulfil[0].value
        test.ok(content.payload.errorInformation, 'Error information is present in the message')
        test.equal(content.context.originalRequestId, request.info.id, 'Original request id matches')
        test.equal(content.context.originalRequestPayload, request.dataUri, 'Original request payload is plugin dataUri')
      } catch (err) {
        test.notOk('Error should not be thrown')
        console.error(err)
      }
      test.end()
    })
    transferErrorTest.end()
  })

  await handlerTest.test('fxTransfers - create should', async createTransferTest => {
    createTransferTest.test('reply with status code 202 if ISO message is sent successfully to kafka', async test => {
      const transferId = '12345'
      const payload = await buildISOFxTransfer(transferId, {}, Ilp.ILP_VERSIONS.v4)
      const request = await createFxISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.fxTransfers+json;version=2.0'
        }
      )
      const reply = createTestReply(test)

      await Handler.create({}, request, reply)
      try {
        const transferPrepare = await wrapWithRetries(() => testConsumer.getEventsForFilter({
          topicFilter: 'topic-transfer-prepare',
          action: 'fx-prepare'
        }), wrapWithRetriesConf.remainingRetries, wrapWithRetriesConf.timeout)
        test.ok(transferPrepare[0], 'Prepare message with key found')
        const { content } = transferPrepare[0].value
        test.ok(content.payload.commitRequestId, 'CommitRequestId is present in the message')
        test.equal(content.context.originalRequestId, request.info.id, 'Original request id matches')
        test.equal(content.context.originalRequestPayload, request.dataUri, 'Original request payload is plugin dataUri')
      } catch (err) {
        test.notOk('Error should not be thrown')
        console.error(err)
      }
      test.end()
    })
  })

  await handlerTest.test('fxTransfers - fulfilTransfer should', async fulfilTransferTest => {
    fulfilTransferTest.test('reply with status code 200 if ISO message is sent successfully to kafka', async test => {
      const transferId = '12345'
      const payload = await buildISOFxFulfil(transferId)
      const request = await createFxISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.fxTransfers+json;version=2.0'
        }
      )
      request.params = { id: transferId }
      const reply = createTestReply(test, 200)

      await Handler.fulfilTransfer({}, request, reply)
      try {
        const transferFulfil = await wrapWithRetries(() => testConsumer.getEventsForFilter({
          topicFilter: 'topic-transfer-fulfil',
          action: 'fx-commit'
        }), wrapWithRetriesConf.remainingRetries, wrapWithRetriesConf.timeout)
        test.ok(transferFulfil[0], 'Fulfil message with key found')
        const { content } = transferFulfil[0].value
        test.ok(content.payload.fulfilment, 'Fulfilment is present in the message')
        test.equal(content.context.originalRequestId, request.info.id, 'Original request id matches')
        test.equal(content.context.originalRequestPayload, request.dataUri, 'Original request payload is plugin dataUri')
      } catch (err) {
        test.notOk('Error should not be thrown')
        console.error(err)
      }
      test.end()
    })
  })

  await handlerTest.test('fxTransfers - transferError should', async transferErrorTest => {
    transferErrorTest.test('reply with status code 200 if ISO error message is sent successfully to kafka', async test => {
      const transferId = '12345'
      const payload = await buildISOFxTransferError()
      const request = await createFxISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.fxTransfers+json;version=2.0'
        }
      )
      request.params = { id: transferId }
      const reply = createTestReply(test, 200)

      await Handler.fulfilTransferError({}, request, reply)
      try {
        const transferFulfil = await wrapWithRetries(() => testConsumer.getEventsForFilter({
          topicFilter: 'topic-transfer-fulfil',
          action: 'fx-abort'
        }), wrapWithRetriesConf.remainingRetries, wrapWithRetriesConf.timeout)
        test.ok(transferFulfil[0], 'Fulfil message with key found')
        const { content } = transferFulfil[0].value
        test.ok(content.payload.errorInformation, 'Error information is present in the message')
        test.equal(content.context.originalRequestId, request.info.id, 'Original request id matches')
        test.equal(content.context.originalRequestPayload, request.dataUri, 'Original request payload is plugin dataUri')
      } catch (err) {
        test.notOk('Error should not be thrown')
        console.error(err)
      }
      test.end()
    })
  })

  await handlerTest.test('teardown', async (assert) => {
    try {
      await testConsumer.destroy() // this disconnects the consumers
      await Kafka.Producer.disconnect()

      assert.end()
    } catch (err) {
      Logger.error(`teardown failed with error - ${err}`)
      assert.fail()
      assert.end()
    }
  })
  handlerTest.end()
})
