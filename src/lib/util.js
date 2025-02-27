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
 --------------
 ******/

const Path = require('path')
const {
  Util: { Hapi, EventFramework: { Tags: { getQueryTags } } },
  Enum: { Events: { Event: { Action } }, Tags: { QueryTags } }
} = require('@mojaloop/central-services-shared')
const Config = require('../lib/config')

const pathForInterface = ({ isHandlerInterface }) => {
  let apiFile
  const pathFolder = '../interface/'
  if (isHandlerInterface) {
    apiFile = 'handler-swagger.yaml'
  } else {
    apiFile = Config.API_TYPE === Hapi.API_TYPES.iso20022
      ? 'api-swagger-iso20022-transfers.yaml'
      : 'api-swagger.yaml'
  }
  return Path.resolve(__dirname, pathFolder + apiFile)
}

// Safely set nested property in an object
const setProp = (obj, path, value) => {
  const pathParts = path.split('.')
  let current = obj

  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i]
    if (part === '__proto__' || part === 'constructor') {
      return
    }
    if (!current[part]) {
      current[part] = {}
    }
    current = current[part]
  }
  const lastPart = pathParts[pathParts.length - 1]
  if (lastPart !== '__proto__' && lastPart !== 'constructor') {
    current[lastPart] = value
  }
}

const getAuditOperationForAction = (action, isFx = false) => {
  switch (action) {
    case Action.COMMIT:
    case Action.FX_COMMIT:
      return isFx ? QueryTags.operation.commitFxTransfer : QueryTags.operation.commitTransfer
    case Action.RESERVE:
    case Action.FX_RESERVE:
      return isFx ? QueryTags.operation.reserveFxTransfer : QueryTags.operation.reserveTransfer
    case Action.REJECT:
    case Action.FX_REJECT:
      return isFx ? QueryTags.operation.rejectFxTransfer : QueryTags.operation.rejectTransfer
    case Action.ABORT:
    case Action.FX_ABORT:
      return isFx ? QueryTags.operation.abortFxTransfer : QueryTags.operation.abortTransfer
    case Action.ABORT_VALIDATION:
    case Action.FX_ABORT_VALIDATION:
      return isFx ? QueryTags.operation.abortFxTransferValidation : QueryTags.operation.abortTransferValidation
    case Action.ABORT_DUPLICATE:
    case Action.FX_ABORT_DUPLICATE:
      return isFx ? QueryTags.operation.abortDuplicateFxTransfer : QueryTags.operation.abortDuplicateTransfer
    case Action.TIMEOUT_RECEIVED:
    case Action.FX_TIMEOUT_RECEIVED:
      return isFx ? QueryTags.operation.fxTimeoutReceived : QueryTags.operation.timeoutReceived
    case Action.TIMEOUT_RESERVED:
    case Action.FX_TIMEOUT_RESERVED:
      return isFx ? QueryTags.operation.fxTimeoutReserved : QueryTags.operation.timeoutReserved
    case Action.PREPARE:
    case Action.FX_PREPARE:
      return isFx ? QueryTags.operation.prepareFxTransfer : QueryTags.operation.prepareTransfer
    case Action.PREPARE_DUPLICATE:
    case Action.FX_PREPARE_DUPLICATE:
      return isFx ? QueryTags.operation.prepareFxTransferDuplicate : QueryTags.operation.prepareTransferDuplicate
    case Action.FULFIL:
    case Action.FX_FULFIL:
      return isFx ? QueryTags.operation.fulfilFxTransfer : QueryTags.operation.fulfilTransfer
    case Action.FULFIL_DUPLICATE:
    case Action.FX_FULFIL_DUPLICATE:
      return isFx ? QueryTags.operation.fulfilDuplicateFxTransfer : QueryTags.operation.fulfilDuplicateTransfer
    case Action.FORWARDED:
    case Action.FX_FORWARDED:
      return isFx ? QueryTags.operation.forwardedFxTransfer : QueryTags.operation.forwardedTransfer
    case Action.RESERVED_ABORTED:
    case Action.FX_RESERVED_ABORTED:
      return isFx ? QueryTags.operation.reservedAbortedFxTransfer : QueryTags.operation.reservedAbortedTransfer
    case Action.GET:
    case Action.FX_GET:
      return isFx ? QueryTags.operation.getFxTransferByID : QueryTags.operation.getTransferByID
    case Action.FX_NOTIFY:
      return QueryTags.operation.notifyFxTransfer
    default:
      throw new Error(`Unsupported action for audit operation: ${action}`)
  }
}

const injectAuditQueryTags = ({
  span,
  id,
  method,
  url = undefined,
  path = undefined,
  action = undefined,
  serviceName = QueryTags.serviceName.mlApiAdapterService,
  auditType = QueryTags.auditType.transactionFlow,
  contentType = QueryTags.contentType.httpRequest,
  operation = undefined,
  isFx = false,
  additionalTags = {}
}) => {
  span.setTags(getQueryTags(
    serviceName,
    auditType,
    contentType,
    operation || getAuditOperationForAction(action, isFx),
    {
      httpMethod: method,
      ...(url ? { url } : {}),
      ...(path ? { httpPath: path } : {}),
      ...(isFx ? { commitRequestId: id } : { transferId: id }),
      ...additionalTags
    }
  ))
}

module.exports = {
  setProp,
  pathForInterface,
  injectAuditQueryTags,
  getAuditOperationForAction
}
