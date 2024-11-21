const safeStringify = require('fast-safe-stringify')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const { Enum, Util } = require('@mojaloop/central-services-shared')
const { TransformFacades } = require('@mojaloop/ml-schema-transformer-lib')
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

const getOriginalPayload = async (content, payloadCache = undefined) => {
  let originalPayload

  if (content.context?.originalRequestPayload) {
    originalPayload = content.context.originalRequestPayload
  } else if (content.context?.originalRequestId && payloadCache) {
    const cacheRequestId = content.context.originalRequestId
    originalPayload = await payloadCache.getPayload(cacheRequestId)
    logger.debug('Notification::processMessage - Original payload found in cache', { cacheRequestId, originalPayload })
  }

  if (!originalPayload) {
    logger.warn('Notification::processMessage - Original payload not found')
  }

  return originalPayload
}

const getCallbackPayload = async (content, payloadCache = undefined) => {
  const isProxied = !!content.headers['fspiop-proxy']
  const isIso = API_TYPE === API_TYPES.iso20022
  const originalPayload = await getOriginalPayload(content, payloadCache)
  const finalPayload = originalPayload ? decodePayload(originalPayload, { asParsed: false }).body : content.payload
  const fspiopObject = content.payload
  let payloadForCallback

  if (fspiopObject.errorInformation) {
    const fspiopError = ErrorHandler.CreateFSPIOPErrorFromErrorInformation(fspiopObject.errorInformation).toApiErrorObject(ERROR_HANDLING)
    payloadForCallback = isProxied && finalPayload ? finalPayload : fspiopError
    if (isIso && !isProxied) {
      payloadForCallback = (await TransformFacades.FSPIOP.transfers.putError({ body: fspiopError })).body
    }
  } else {
    payloadForCallback = finalPayload
  }

  payloadForCallback = typeof payloadForCallback === 'string' ? payloadForCallback : safeStringify(payloadForCallback)

  return { fspiopObject, payloadForCallback }
}

const notificationMessageDto = async (message, payloadCache = undefined) => {
  const { metadata, from, to, content } = message.value
  const { action, state } = metadata.event

  const actionLower = action.toLowerCase()
  const status = state.status.toLowerCase()
  const isSuccess = status === SUCCESS.status
  const isFx = FX_ACTIONS.includes(actionLower)

  logger.info('Notification::processMessage - action, status: ', { actionLower, status, isFx, isSuccess })

  const { payloadForCallback, fspiopObject } = await getCallbackPayload(content, payloadCache)

  let id = content.uriParams?.id
  if (!id) {
    id = fspiopObject.transferId || fspiopObject.commitRequestId
  }

  return Object.freeze({
    id,
    from,
    to,
    action: actionLower,
    content,
    isFx,
    isSuccess,
    fspiopObject,
    payloadForCallback
  })
}

module.exports = {
  notificationMessageDto
}
