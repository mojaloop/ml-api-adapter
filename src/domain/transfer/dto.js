const { Enum, Util } = require('@mojaloop/central-services-shared')
const { logger } = require('../../shared/logger')
const { KAFKA_CONFIG } = require('../../lib/config')

const { StreamingProtocol, Kafka } = Util
const { TransferState } = Enum.Transfers
const { Action, Type } = Enum.Events.Event

const FX_ACTION_KEY_PREFIX = 'FX_'

const eventStateDto = () => {
  const { SUCCESS } = Enum.Events.EventStatus
  const dto = StreamingProtocol.createEventState(SUCCESS.status, SUCCESS.code, SUCCESS.description)
  return Object.freeze(dto)
}

const makeMessageMetadata = (id, type, action) => {
  const state = eventStateDto()
  const event = StreamingProtocol.createEventMetadata(type, action, state)
  return StreamingProtocol.createMetadata(id, event)
}

const prepareMessageDto = ({ headers, dataUri, payload, logPrefix = '', context, isIsoMode }) => {
  const isFx = !!payload.commitRequestId
  const action = isFx ? Action.FX_PREPARE : Action.PREPARE
  const id = isFx ? payload.commitRequestId : payload.transferId
  const to = isFx ? payload.counterPartyFsp : payload.payeeFsp
  const from = isFx ? payload.initiatingFsp : payload.payerFsp
  let messageProtocol
  const metadata = makeMessageMetadata(id, Type.PREPARE, action)
  if (!isIsoMode) {
    messageProtocol = StreamingProtocol.createMessageFromRequest(id, { headers, dataUri, params: { id } }, to, from, metadata, context)
  } else {
    messageProtocol = StreamingProtocol.createMessage(
      id,
      to,
      from,
      metadata,
      headers,
      payload,
      { id },
      undefined,
      context
    )
  }

  logger.debug(`${logPrefix}::messageProtocol`, { messageProtocol })

  return Object.freeze(messageProtocol)
}

const forwardedMessageDto = (id, from, to, payload, context = {}) => Object.freeze(StreamingProtocol.createMessage(
  id,
  to,
  from,
  makeMessageMetadata(id, Type.PREPARE, Action.FORWARDED),
  undefined,
  payload,
  undefined,
  undefined,
  context
))

const fxForwardedMessageDto = (id, from, to, payload, context = {}) => Object.freeze(StreamingProtocol.createMessage(
  id,
  to,
  from,
  makeMessageMetadata(id, Type.PREPARE, Action.FX_FORWARDED),
  undefined,
  payload,
  undefined,
  undefined,
  context
))

const baseFulfillMessageDto = ({ action, headers, dataUri, params, logPrefix, context, payload, isIsoMode }) => {
  const to = headers[Enum.Http.Headers.FSPIOP.DESTINATION]
  const from = headers[Enum.Http.Headers.FSPIOP.SOURCE]
  const metadata = makeMessageMetadata(params.id, Type.FULFIL, action)
  let messageProtocol

  if (!isIsoMode) {
    messageProtocol = StreamingProtocol.createMessageFromRequest(params.id, { headers, dataUri, params: { id: params.id } }, to, from, metadata, context)
  } else {
    messageProtocol = StreamingProtocol.createMessage(
      params.id,
      to,
      from,
      metadata,
      headers,
      payload,
      { id: params.id },
      undefined,
      context
    )
  }
  logger.debug(`${logPrefix}::messageProtocol`, { messageProtocol })

  return Object.freeze(messageProtocol)
}

const fulfilMessageDto = ({ headers, dataUri, payload, params, logPrefix = '', context, isIsoMode }) => {
  const isFx = !payload.transferState
  const state = payload.transferState || payload.conversionState
  const actionKey = state === TransferState.ABORTED
    ? 'REJECT'
    : (state === TransferState.RESERVED)
        ? 'RESERVE'
        : 'COMMIT'
  const action = Action[`${isFx ? FX_ACTION_KEY_PREFIX : ''}${actionKey}`]

  return baseFulfillMessageDto({ action, headers, dataUri, params, logPrefix, payload, context, isIsoMode })
}

const fulfilErrorMessageDto = ({ headers, dataUri, params, isFx, logPrefix = '', payload, context, isIsoMode }) => {
  const action = Action[`${isFx ? FX_ACTION_KEY_PREFIX : ''}ABORT`]
  return baseFulfillMessageDto({ action, headers, dataUri, params, logPrefix, payload, context, isIsoMode })
}

const getMessageDto = ({ headers, params, isFx, logPrefix = '', context }) => {
  const action = isFx ? Action.FX_GET : Action.GET
  const to = headers[Enum.Http.Headers.FSPIOP.DESTINATION]
  const from = headers[Enum.Http.Headers.FSPIOP.SOURCE]

  const metadata = makeMessageMetadata(params.id, Type.GET, action)
  const messageProtocol = StreamingProtocol.createMessageFromRequest(params.id, { headers, dataUri: undefined, params }, to, from, metadata, context)
  logger.debug(`${logPrefix}::messageProtocol`, { messageProtocol })

  return Object.freeze(messageProtocol)
}

const producerConfigDto = (functionality, action, logPrefix = '') => {
  const topicConfig = Kafka.createGeneralTopicConf(KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, functionality, action)
  const kafkaConfig = Kafka.getKafkaConfig(KAFKA_CONFIG, Enum.Kafka.Config.PRODUCER, functionality.toUpperCase(), action.toUpperCase())
  logger.debug(`${logPrefix}::topicConfig`, { topicConfig })

  return Object.freeze({ topicConfig, kafkaConfig })
}

const setOriginalRequestPayload = async (kafkaMessageContext, payloadCache = undefined) => {
  await payloadCache.setPayload(
    kafkaMessageContext.originalRequestId,
    kafkaMessageContext.originalRequestPayload
  )
}

module.exports = {
  prepareMessageDto,
  forwardedMessageDto,
  fxForwardedMessageDto,
  fulfilMessageDto,
  fulfilErrorMessageDto,
  eventStateDto,
  producerConfigDto,
  getMessageDto,
  setOriginalRequestPayload
}
