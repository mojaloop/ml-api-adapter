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

const Ilp = require('@mojaloop/sdk-standard-components').Ilp
const EventSdk = require('@mojaloop/event-sdk')
const Uuid = require('uuid4')
const KafkaUtil = require('@mojaloop/central-services-shared').Util.Kafka
const { Enum } = require('@mojaloop/central-services-shared')
const { STORAGE_TYPES } = require('@mojaloop/inter-scheme-proxy-cache-lib')
const { TransformFacades } = require('@mojaloop/ml-schema-transformer-lib')

const generateTransferId = () => {
  return Uuid()
}

const generateParentTestSpan = () => {
  return EventSdk.Tracer.createSpan('test_span')
}

const ilpV1Packet = 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA'
const ilpV1Condition = 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA'
const ilpV4Packet = 'DIIDSgAAAAAAAMNQMjAxNzExMTUyMzE3Mjg5ODVPqz_E707Be6heJ0uDF-up-UEj013dNAKkU1Xy0buXqQpnLm1vamFsb29wggMDZXlKeGRXOTBaVWxrSWpvaU1qQTFNRGd4T0RZdE1UUTFPQzAwWVdNd0xXRTRNalF0WkRSaU1EZGxNemRrTjJJeklpd2lkSEpoYm5OaFkzUnBiMjVKWkNJNklqSXdOVEE0TVRnMkxURTBOVGd0TkdGak1DMWhPREkwTFdRMFlqQTNaVE0zWkRkaU15SXNJblJ5WVc1ellXTjBhVzl1Vkhsd1pTSTZleUp6WTJWdVlYSnBieUk2SWxSU1FVNVRSa1ZTSWl3aWFXNXBkR2xoZEc5eUlqb2lVRUZaUlZJaUxDSnBibWwwYVdGMGIzSlVlWEJsSWpvaVEwOU9VMVZOUlZJaUxDSmlZV3hoYm1ObFQyWlFZWGx0Wlc1MGN5STZJakV4TUNKOUxDSndZWGxsWlNJNmV5SndZWEowZVVsa1NXNW1ieUk2ZXlKd1lYSjBlVWxrVkhsd1pTSTZJazFUU1ZORVRpSXNJbkJoY25SNVNXUmxiblJwWm1sbGNpSTZJakV5TXpRMU5qYzRPU0lzSW1aemNFbGtJam9pVFc5aWFXeGxUVzl1WlhraWZYMHNJbkJoZVdWeUlqcDdJbkJsY25OdmJtRnNTVzVtYnlJNmV5SmpiMjF3YkdWNFRtRnRaU0k2ZXlKbWFYSnpkRTVoYldVaU9pSk5ZWFJ6SWl3aWJHRnpkRTVoYldVaU9pSklZV2R0WVc0aWZYMHNJbkJoY25SNVNXUkpibVp2SWpwN0luQmhjblI1U1dSVWVYQmxJam9pVFZOSlUwUk9JaXdpY0dGeWRIbEpaR1Z1ZEdsbWFXVnlJam9pT1RnM05qVTBNeUlzSW1aemNFbGtJam9pUW1GdWEwNXlUMjVsSW4xOUxDSmxlSEJwY21GMGFXOXVJam9pTWpBeE55MHhNUzB4TlZReU1qb3hOem95T0M0NU9EVXRNREU2TURBaUxDSmhiVzkxYm5RaU9uc2lZVzF2ZFc1MElqb2lOVEF3SWl3aVkzVnljbVZ1WTNraU9pSlZVMFFpZlgw'
const ilpV4Condition = 'T6s_xO9OwXuoXidLgxfrqflBI9Nd3TQCpFNV8tG7l6k'

const buildTransfer = (transferId, ilpPacketVersion) => {
  return {
    transferId,
    payeeFsp: 'dfsp1',
    payerFsp: 'dfsp2',
    amount: {
      currency: 'USD',
      amount: '123.45'
    },
    ilpPacket: ilpPacketVersion === Ilp.ILP_VERSIONS.v4 ? ilpV4Packet : ilpV1Packet,
    condition: ilpPacketVersion === Ilp.ILP_VERSIONS.v4 ? ilpV4Condition : ilpV1Condition,
    expiration: new Date(new Date().getTime() + 6000),
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

const buildFXTransfer = (commitRequestId, ilpPacketVersion) => {
  return {
    commitRequestId,
    determiningTransferId: Uuid(),
    initiatingFsp: 'dfsp1',
    counterPartyFsp: 'fxp1',
    amountType: 'SEND',
    sourceAmount: { amount: 100, currency: 'KWS' },
    targetAmount: { amount: 200, currency: 'TZS' },
    condition: ilpPacketVersion === Ilp.ILP_VERSIONS.v4 ? ilpV4Condition : ilpV1Condition,
    expiration: new Date(new Date().getTime() + 6000),
    ilpPacket: ilpPacketVersion === Ilp.ILP_VERSIONS.v4 ? ilpV4Packet : ilpV1Packet
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
    completedTimestamp: new Date().toISOString(),
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

const buildISOTransfer = async (transferId, headers, ilpPacketVersion) => {
  const transfer = buildTransfer(transferId, ilpPacketVersion)
  return (await TransformFacades.FSPIOP.transfers.post({ body: transfer, headers })).body
}

const buildISOFxTransfer = async (commitRequestId, headers, ilpPacketVersion) => {
  const fxTransfer = buildFXTransfer(commitRequestId, ilpPacketVersion)
  return (await TransformFacades.FSPIOP.fxTransfers.post({ body: fxTransfer, headers })).body
}

const buildISOTransferError = async (headers) => {
  const error = buildTransferError()
  return (await TransformFacades.FSPIOP.transfers.putError({ body: error, headers })).body
}

const buildISOFxTransferError = async (headers) => {
  const error = buildTransferError()
  return (await TransformFacades.FSPIOP.fxTransfers.putError({ body: error, headers })).body
}

const buildISOFulfil = async (headers) => {
  const fulfil = buildFulfil()
  return (await TransformFacades.FSPIOP.transfers.put({ body: fulfil, headers })).body
}

const buildISOFxFulfil = async (headers) => {
  const fulfil = buildFulfil()
  return (await TransformFacades.FSPIOP.fxTransfers.put({ body: fulfil, headers })).body
}

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
  proxyCacheConfigDto,
  buildISOTransfer,
  buildISOFxTransfer,
  buildISOTransferError,
  buildISOFxTransferError,
  buildISOFulfil,
  buildISOFxFulfil
}
