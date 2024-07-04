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

const prepareMessageDto = ({ headers, dataUri, payload, logPrefix = '' }) => {
  const isFx = !!payload.commitRequestId
  const action = isFx ? Action.FX_PREPARE : Action.PREPARE
  const id = isFx ? payload.commitRequestId : payload.transferId
  const to = isFx ? payload.counterPartyFsp : payload.payeeFsp
  const from = isFx ? payload.initiatingFsp : payload.payerFsp

  const metadata = makeMessageMetadata(id, Type.PREPARE, action)
  const messageProtocol = StreamingProtocol.createMessageFromRequest(id, { headers, dataUri, params: { id } }, to, from, metadata)
  logger.debug(`${logPrefix}::messageProtocol`, messageProtocol)

  return Object.freeze(messageProtocol)
}

const forwardedMessageDto = (id, from, to) => Object.freeze(StreamingProtocol.createMessage(
  id,
  to,
  from,
  makeMessageMetadata(id, Type.PREPARE, 'forwarded' /* Action.FORWARDED */) // todo change to Action.FORWARDED after merging https://github.com/mojaloop/central-services-shared/pull/389
))

const baseFulfillMessageDto = ({ action, headers, dataUri, params, logPrefix }) => {
  const to = headers[Enum.Http.Headers.FSPIOP.DESTINATION]
  const from = headers[Enum.Http.Headers.FSPIOP.SOURCE]

  const metadata = makeMessageMetadata(params.id, Type.FULFIL, action)
  const messageProtocol = StreamingProtocol.createMessageFromRequest(params.id, { headers, dataUri, params }, to, from, metadata)
  logger.debug(`${logPrefix}::messageProtocol - ${JSON.stringify(messageProtocol)}`)

  return Object.freeze(messageProtocol)
}

const fulfilMessageDto = ({ headers, dataUri, payload, params, logPrefix = '' }) => {
  const isFx = !payload.transferState
  const state = payload.transferState || payload.conversionState
  const actionKey = state === TransferState.ABORTED
    ? 'REJECT'
    : (state === TransferState.RESERVED)
        ? 'RESERVE'
        : 'COMMIT'
  const action = Action[`${isFx ? FX_ACTION_KEY_PREFIX : ''}${actionKey}`]

  return baseFulfillMessageDto({ action, headers, dataUri, params, logPrefix })
}

const fulfilErrorMessageDto = ({ headers, dataUri, params, isFx, logPrefix = '' }) => {
  const action = Action[`${isFx ? FX_ACTION_KEY_PREFIX : ''}ABORT`]
  return baseFulfillMessageDto({ action, headers, dataUri, params, logPrefix })
}

const getMessageDto = ({ headers, params, isFx, logPrefix = '' }) => {
  const action = isFx ? Action.FX_GET : Action.GET
  const to = headers[Enum.Http.Headers.FSPIOP.DESTINATION]
  const from = headers[Enum.Http.Headers.FSPIOP.SOURCE]

  const metadata = makeMessageMetadata(params.id, Type.GET, action)
  const messageProtocol = StreamingProtocol.createMessageFromRequest(params.id, { headers, dataUri: undefined, params }, to, from, metadata)
  logger.debug(`${logPrefix}::messageProtocol`, messageProtocol)

  return Object.freeze(messageProtocol)
}

const producerConfigDto = (functionality, action, logPrefix = '') => {
  const topicConfig = Kafka.createGeneralTopicConf(KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, functionality, action)
  const kafkaConfig = Kafka.getKafkaConfig(KAFKA_CONFIG, Enum.Kafka.Config.PRODUCER, functionality.toUpperCase(), action.toUpperCase())
  logger.debug(`${logPrefix}::topicConfig`, topicConfig)
  logger.info(`${logPrefix}::kafkaConfig`, kafkaConfig)

  return Object.freeze({ topicConfig, kafkaConfig })
}

module.exports = {
  prepareMessageDto,
  forwardedMessageDto,
  fulfilMessageDto,
  fulfilErrorMessageDto,
  eventStateDto,
  producerConfigDto,
  getMessageDto
}
