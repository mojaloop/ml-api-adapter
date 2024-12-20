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
 --------------
 ******/

'use strict'

const EventSdk = require('@mojaloop/event-sdk')
const Uuid = require('uuid4')
const KafkaUtil = require('@mojaloop/central-services-shared').Util.Kafka
const { Enum } = require('@mojaloop/central-services-shared')
const { STORAGE_TYPES } = require('@mojaloop/inter-scheme-proxy-cache-lib')

const generateTransferId = () => {
  return Uuid()
}

const generateParentTestSpan = () => {
  return EventSdk.Tracer.createSpan('test_span')
}

const buildTransfer = (transferId) => {
  return {
    transferId,
    payeeFsp: 'dfsp1',
    payerFsp: 'dfsp2',
    amount: {
      currency: 'USD',
      amount: '123.45'
    },
    ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
    condition: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
    expiration: '2016-05-24T08:38:08.699-04:00',
    extensionList:
    {
      extension:
      [
        {
          key: 'errorDescription',
          value: 'This is a more detailed error description'
        },
        {
          key: 'errorDescription',
          value: 'This is a more detailed error description'
        }
      ]
    }
  }
}

const buildFXTransfer = (commitRequestId) => {
  return {
    commitRequestId,
    determiningTransferId: Uuid(),
    initiatingFsp: 'dfsp1',
    counterPartyFsp: 'fxp1',
    amountType: 'SEND',
    sourceAmount: { amount: 100, currency: 'KWS' },
    targetAmount: { amount: 200, currency: 'TZS' },
    condition: 'uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvze1',
    expiration: '2018-08-24T21:31:00.534+01:00',
    ilpPacket: 'AQAAAAAAAABkEGcuZXdwMjEuaWQuODAwMjCCAhd7InRyYW5zYWN0aW9uSWQiOiJmODU0NzdkYi0xMzVkLTRlMDgtYThiNy0xMmIyMmQ4MmMwZDYiLCJxdW90ZUlkIjoiOWU2NGYzMjEtYzMyNC00ZDI0LTg5MmYtYzQ3ZWY0ZThkZTkxIiwicGF5ZWUiOnsicGFydHlJZEluZm8iOnsicGFydHlJZFR5cGUiOiJNU0lTRE4iLCJwYXJ0eUlkZW50aWZpZXIiOiIyNTYxMjM0NTYiLCJmc3BJZCI6IjIxIn19LCJwYXllciI6eyJwYXJ0eUlkSW5mbyI6eyJwYXJ0eUlkVHlwZSI6Ik1TSVNETiIsInBhcnR5SWRlbnRpZmllciI6IjI1NjIwMTAwMDAxIiwiZnNwSWQiOiIyMCJ9LCJwZXJzb25hbEluZm8iOnsiY29tcGxleE5hbWUiOnsiZmlyc3ROYW1lIjoiTWF0cyIsImxhc3ROYW1lIjoiSGFnbWFuIn0sImRhdGVPZkJpcnRoIjoiMTk4My0xMC0yNSJ9fSwiYW1vdW50Ijp7ImFtb3VudCI6IjEwMCIsImN1cnJlbmN5IjoiVVNEIn0sInRyYW5zYWN0aW9uVHlwZSI6eyJzY2VuYXJpbyI6IlRSQU5TRkVSIiwiaW5pdGlhdG9yIjoiUEFZRVIiLCJpbml0aWF0b3JUeXBlIjoiQ09OU1VNRVIifSwibm90ZSI6ImhlaiJ9'
  }
}

const buildTransferError = () => {
  return {
    errorInformation: {
      errorCode: '3100',
      errorDescription: 'Generic error'
    },
    extensionList:
    {
      extension:
      [
        {
          key: 'errorDescription',
          value: 'This is a more detailed error description'
        },
        {
          key: 'errorDescription',
          value: 'This is a more detailed error description'
        }
      ]
    }
  }
}

const buildFulfil = () => {
  return {
    transferState: 'RESERVED',
    fulfilment: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
    completedTimestamp: '2024-04-06T08:38:08.699-04:00',
    extensionList:
    {
      extension:
      [
        {
          key: 'errorDescription',
          value: 'This is a more detailed error description'
        },
        {
          key: 'errorDescription',
          value: 'This is a more detailed error description'
        }
      ]
    }
  }
}

const buildHeaders = {
  accept: 'application/vnd.interoperability.participants+json;version=1',
  'fspiop-destination': 'dsfp1',
  'content-type': 'application/vnd.interoperability.participants+json;version=1.1',
  date: '2019-05-24 08:52:19',
  'fspiop-source': 'dfsp2'
}

const createProducerConfig = (kafkaConfig, kafkaConfigEventType, kafkaConfigEventAction, configTemplate, topicEventType, topicEventAction) => {
  return {
    kafkaConfig: KafkaUtil.getKafkaConfig(kafkaConfig, Enum.Kafka.Config.PRODUCER, kafkaConfigEventType.toUpperCase(), kafkaConfigEventAction.toUpperCase()),
    topicConfig: KafkaUtil.createGeneralTopicConf(configTemplate, topicEventType, topicEventAction)
  }
}

const createMessageProtocol = (eventType = 'prepare', eventAction = 'prepare', payload = {}, source = 'dfsp1', destination = 'dfsp2') => {
  return {
    metadata: {
      event: {
        id: Uuid(),
        createdAt: new Date(),
        type: eventType,
        action: eventAction,
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
        'fspiop-destination': destination,
        'fspiop-source': source
      },
      payload
    },
    to: destination,
    from: source,
    id: Uuid(),
    type: 'application/json'
  }
}

const proxyCacheConfigDto = ({ host = 'localhost' } = {}) => ({
  type: STORAGE_TYPES.redisCluster,
  proxyConfig: {
    cluster: [
      { host, port: 6379 }
    ]
  }
})

module.exports = {
  buildTransfer,
  buildFXTransfer,
  buildTransferError,
  buildFulfil,
  buildHeaders,
  generateTransferId,
  generateParentTestSpan,
  createMessageProtocol,
  createProducerConfig,
  proxyCacheConfigDto
}
