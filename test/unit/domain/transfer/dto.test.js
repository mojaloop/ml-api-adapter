/*****
 License
 --------------
 Copyright © 2020-2024 Mojaloop Foundation
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

const Test = require('tapes')(require('tape'))
const { Enum } = require('@mojaloop/central-services-shared')
const dto = require('../../../../src/domain/transfer/dto')
const mocks = require('../../mocks')

const { Event, EventStatus } = Enum.Events

Test('DTO tests -->', dtoTest => {
  dtoTest.test('eventStateDto test', test => {
    const data = dto.eventStateDto()
    test.same(data, EventStatus.SUCCESS)
    test.end()
  })

  const headers = {}
  const dataUri = ''

  dtoTest.test('prepareMessageDto FX_PREPARE test', test => {
    const payload = mocks.mockFxPreparePayload()
    const data = dto.prepareMessageDto({ headers, dataUri, payload })
    test.ok(data.metadata.event.action === Event.Action.FX_PREPARE)
    test.end()
  })

  dtoTest.test('forwardedMessageDto test', test => {
    const expected = {
      id: 1,
      to: 'to',
      from: 'from',
      type: 'application/json',
      content: {
        uriParams: undefined,
        headers: undefined,
        payload: { id: 1, from: 'from' },
        context: undefined
      },
      metadata: {
        correlationId: 1,
        event: {
          type: 'prepare',
          action: 'forwarded',
          state: { status: 'success', code: 0, description: 'action successful' }
        }
      }
    }
    const message = dto.forwardedMessageDto(expected.id, expected.from, expected.to, expected.content.payload)
    expected.metadata.event.createdAt = message.metadata.event.createdAt
    test.deepEquals(message, expected, 'forwardedMessageDto should match')
    test.end()
  })

  dtoTest.test('fxForwardedMessageDto test', test => {
    const expected = {
      id: 1,
      to: 'to',
      from: 'from',
      type: 'application/json',
      content: {
        uriParams: undefined,
        headers: undefined,
        payload: { id: 1, from: 'from' },
        context: undefined
      },
      metadata: {
        correlationId: 1,
        event: {
          type: 'prepare',
          action: 'fx-forwarded',
          state: { status: 'success', code: 0, description: 'action successful' }
        }
      }
    }
    const message = dto.fxForwardedMessageDto(expected.id, expected.from, expected.to, expected.content.payload)
    expected.metadata.event.createdAt = message.metadata.event.createdAt
    test.deepEquals(message, expected, 'forwardedMessageDto should match')
    test.end()
  })

  dtoTest.test('fulfilMessageDto FX_RESERVE test', test => {
    const payload = mocks.mockFxFulfilPayload()
    const params = { id: '1234' }
    const data = dto.fulfilMessageDto({ headers, dataUri, payload, params })
    test.ok(data.metadata.event.action === Event.Action.FX_RESERVE)
    test.end()
  })

  dtoTest.test('fulfilErrorMessageDto ABORT test', test => {
    const payload = mocks.mockFxFulfilPayload()
    const params = { id: '1234' }
    const data = dto.fulfilErrorMessageDto({ headers, dataUri, payload, params })
    test.ok(data.metadata.event.action === Event.Action.ABORT)
    test.end()
  })

  dtoTest.test('producerConfigDto test', test => {
    const functionality = 'transfer'
    const action = 'prepare'
    const { topicConfig, kafkaConfig } = dto.producerConfigDto(functionality, action)
    test.ok(topicConfig.topicName === `topic-${functionality}-${action}`)
    test.ok(kafkaConfig.rdkafkaConf['client.id'] === `ml-prod-${functionality}-${action}`)
    test.end()
  })

  dtoTest.end()
})
