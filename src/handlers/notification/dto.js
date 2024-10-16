const ErrorHandler = require('@mojaloop/central-services-error-handling')
const { Enum, Util } = require('@mojaloop/central-services-shared')
const { logger } = require('../../shared/logger')
const { ERROR_HANDLING, API_TYPE } = require('../../lib/config')
const { API_TYPES } = require('../../shared/constants')

const { Action } = Enum.Events.Event
const { SUCCESS } = Enum.Events.EventStatus
const { decodePayload } = Util.StreamingProtocol

const FX_ACTIONS = [
  Action.FX_GET,
  Action.FX_ABORT,
  Action.FX_COMMIT,
  Action.FX_PREPARE,
  Action.FX_REJECT,
  Action.FX_RESERVE,
  Action.FX_PREPARE_DUPLICATE,
  Action.FX_ABORT,
  Action.FX_ABORT_VALIDATION,
  Action.FX_RESERVED_ABORTED,
  Action.FX_FORWARDED,
  Action.FX_FULFIL,
  Action.FX_FULFIL_DUPLICATE,
  Action.FX_ABORT_DUPLICATE,
  Action.FX_TIMEOUT_RESERVED,
  Action.FX_TIMEOUT_RECEIVED,
  Action.FX_NOTIFY
]

const getCallbackPayload = (content) => {
  let originalPayload
  if (msg.value.content.context.originalRequestPayload) {
    originalPayload = msg.value.content.context.originalRequestPayload
  } else {
    const cacheRequestId = msg.value.content.context.originalRequestId
    // TODO: ISO20022: get the original request from the cache
  }

  const decodedOriginalPayload = decodePayload(originalPayload, { asParsed: false })
  // content.payload should be already parsed as per the new design and it is in fspiop format
  const fspiopPayload = content.payload
  let payloadForCallback

  if (fspiopPayload.errorInformation) {
    if (API_TYPE === API_TYPES.iso20022) {
      // TODO: ISO20022: construct ISO20022 error message here
    } else {
      payloadForCallback = JSON.stringify(ErrorHandler.CreateFSPIOPErrorFromErrorInformation(fspiopPayload.errorInformation).toApiErrorObject(ERROR_HANDLING))
    }
  } else {
    payloadForCallback = decodedOriginalPayload.body.toString()
  }

  return { fspiopPayload, payloadForCallback }
}

const notificationMessageDto = (message) => {
  const { metadata, from, to, content } = message.value
  const { action, state } = metadata.event

  const actionLower = action.toLowerCase()
  const status = state.status.toLowerCase()
  const isSuccess = status === SUCCESS.status
  const isFx = FX_ACTIONS.includes(actionLower)

  logger.info('Notification::processMessage - action, status: ', { actionLower, status, isFx, isSuccess })

  const { payloadForCallback, fspiopPayload } = getCallbackPayload(content)

  let id = content.uriParams?.id
  if (!id) {
    id = fspiopPayload.transferId || fspiopPayload.commitRequestId
  }

  return Object.freeze({
    id,
    from,
    to,
    action: actionLower,
    content,
    isFx,
    isSuccess,
    fspiopPayload,
    payloadForCallback
  })
}

module.exports = {
  notificationMessageDto
}
