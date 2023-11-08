const { Enum, Util } = require('@mojaloop/central-services-shared')
const { logger } = require('../../shared/logger')

const { StreamingProtocol } = Util
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

const prepareMessageDto = (headers, dataUri, payload, logPrefix = '') => {
  const isFx = !!payload.commitRequestId
  const action = isFx ? Action.FX_PREPARE : Action.PREPARE
  const id = isFx ? payload.commitRequestId : payload.transferId
  const to = isFx ? payload.counterPartyFsp : payload.payeeFsp
  const from = isFx ? payload.initiatingFsp : payload.payerFsp

  const metadata = makeMessageMetadata(id, Type.PREPARE, action)
  const messageProtocol = StreamingProtocol.createMessageFromRequest(id, { headers, dataUri, params: { id } }, to, from, metadata)
  logger.debug(`${logPrefix}::messageProtocol - ${JSON.stringify(messageProtocol)}`)

  return Object.freeze(messageProtocol)
}

const fulfilMessageDto = (headers, dataUri, payload, params, logPrefix = '') => {
  const isFx = !payload.transferState
  const actionKey = payload.transferState === TransferState.ABORTED
    ? 'REJECT'
    : (payload.transferState === TransferState.RESERVED)
        ? 'RESERVE'
        : 'COMMIT'
  const action = Action[`${isFx ? FX_ACTION_KEY_PREFIX : ''}${actionKey}`]
  const to = headers[Enum.Http.Headers.FSPIOP.DESTINATION]
  const from = headers[Enum.Http.Headers.FSPIOP.SOURCE]

  const metadata = makeMessageMetadata(params.id, Type.FULFIL, action)
  const messageProtocol = StreamingProtocol.createMessageFromRequest(params.id, { headers, dataUri, params }, to, from, metadata)
  logger.debug(`${logPrefix}::messageProtocol - ${JSON.stringify(messageProtocol)}`)

  return Object.freeze(messageProtocol)
}

module.exports = {
  prepareMessageDto,
  fulfilMessageDto,
  eventStateDto
}
