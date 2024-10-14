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
        payload: { id: 1, from: 'from' }
      },
      metadata: {
        correlationId: 1,
        event: {
          type: 'prepare',
          action: 'forwarded',
          state: { status: 'success', code: 0, description: 'action successful' }
        }
      },
      context: {}
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
        payload: { id: 1, from: 'from' }
      },
      metadata: {
        correlationId: 1,
        event: {
          type: 'prepare',
          action: 'fx-forwarded',
          state: { status: 'success', code: 0, description: 'action successful' }
        }
      },
      context: {}
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
