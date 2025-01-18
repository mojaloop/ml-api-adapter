/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
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
const safeStringify = require('fast-safe-stringify')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const { Enum, Util } = require('@mojaloop/central-services-shared')
const { TransformFacades } = require('@mojaloop/ml-schema-transformer-lib')
const { logger } = require('../../shared/logger')
const { ERROR_HANDLING, API_TYPE, HUB_NAME } = require('../../lib/config')
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

const getCallbackPayload = async (content, payloadCache = undefined, fromSwitch = false) => {
  const isIsoMode = API_TYPE === API_TYPES.iso20022
  const originalPayload = await getOriginalPayload(content, payloadCache)
  const finalPayload = originalPayload ? decodePayload(originalPayload, { asParsed: false }).body : content.payload
  const fspiopObject = content.payload
  let payloadForCallback = finalPayload

  if (fspiopObject.errorInformation && fromSwitch) {
    const fspiopError = ErrorHandler.CreateFSPIOPErrorFromErrorInformation(fspiopObject.errorInformation).toApiErrorObject(ERROR_HANDLING)
    // If we're in ISO mode and source is switch, then this is a hub-generated error (in current hub).
    // If so, we need to generate an ISO error to forward.
    if (isIsoMode) {
      payloadForCallback = (await TransformFacades.FSPIOP.transfers.putError({ body: fspiopError })).body
    } else {
      payloadForCallback = fspiopError
    }
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
  const fromSwitch = (from === HUB_NAME)
  const isOriginalId = content.context?.isOriginalId

  logger.info('Notification::processMessage - action, status: ', { actionLower, status, isFx, isSuccess })

  const { payloadForCallback, fspiopObject } = await getCallbackPayload(content, payloadCache, fromSwitch)

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
    isOriginalId,
    fspiopObject,
    payloadForCallback
  })
}

module.exports = {
  notificationMessageDto
}
