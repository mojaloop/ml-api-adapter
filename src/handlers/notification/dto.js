const ErrorHandler = require('@mojaloop/central-services-error-handling')
const { Enum, Util } = require('@mojaloop/central-services-shared')
const { logger } = require('../../shared/logger')
const { ERROR_HANDLING } = require('../../lib/config')

const { Action } = Enum.Events.Event
const { SUCCESS } = Enum.Events.EventStatus
const { decodePayload, isDataUri } = Util.StreamingProtocol

const FX_ACTIONS = [
  Action.FX_ABORT,
  Action.FX_COMMIT,
  Action.FX_PREPARE,
  Action.FX_REJECT,
  Action.FX_RESERVE
]

const getCallbackPayload = (content) => {
  const decodedPayload = decodePayload(content.payload, { asParsed: false })
  let payloadForCallback

  if (isDataUri(content.payload)) {
    payloadForCallback = decodedPayload.body.toString()
  } else {
    const parsedPayload = JSON.parse(decodedPayload.body)
    if (parsedPayload.errorInformation) {
      payloadForCallback = JSON.stringify(ErrorHandler.CreateFSPIOPErrorFromErrorInformation(parsedPayload.errorInformation).toApiErrorObject(ERROR_HANDLING))
    } else {
      payloadForCallback = decodedPayload.body.toString()
    }
  }

  return { decodedPayload, payloadForCallback }
}

const notificationMessageDto = (message) => {
  const { metadata, from, to, content } = message.value
  const { action, state } = metadata.event

  const actionLower = action.toLowerCase()
  const status = state.status.toLowerCase()
  const isSuccess = status === SUCCESS.status
  const isFx = FX_ACTIONS.includes(actionLower)

  logger.info('Notification::processMessage - action, status: ', { actionLower, status, isFx, isSuccess })
  const { payloadForCallback, decodedPayload } = getCallbackPayload(content)

  let id = content.uriParams?.id
  if (!id) {
    const body = JSON.parse(decodedPayload.body)
    id = body.transferId || body.commitRequestId
  }

  return Object.freeze({
    id,
    from,
    to,
    action: actionLower,
    content,
    isFx,
    isSuccess,
    payloadForCallback
  })
}

module.exports = {
  notificationMessageDto
}
