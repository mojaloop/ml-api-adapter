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

const actionsOperationsMap = Object.freeze({
  [Action.COMMIT]: QueryTags.operation.commitTransfer,
  [Action.FX_COMMIT]: QueryTags.operation.commitFxTransfer,
  [Action.RESERVE]: QueryTags.operation.reserveTransfer,
  [Action.FX_RESERVE]: QueryTags.operation.reserveFxTransfer,
  [Action.REJECT]: QueryTags.operation.rejectTransfer,
  [Action.FX_REJECT]: QueryTags.operation.rejectFxTransfer,
  [Action.ABORT]: QueryTags.operation.abortTransfer,
  [Action.FX_ABORT]: QueryTags.operation.abortFxTransfer,
  [Action.ABORT_VALIDATION]: QueryTags.operation.abortTransferValidation,
  [Action.FX_ABORT_VALIDATION]: QueryTags.operation.abortFxTransferValidation,
  [Action.ABORT_DUPLICATE]: QueryTags.operation.abortDuplicateTransfer,
  [Action.FX_ABORT_DUPLICATE]: QueryTags.operation.abortDuplicateFxTransfer,
  [Action.TIMEOUT_RECEIVED]: QueryTags.operation.timeoutReceived,
  [Action.FX_TIMEOUT_RECEIVED]: QueryTags.operation.fxTimeoutReceived,
  [Action.TIMEOUT_RESERVED]: QueryTags.operation.timeoutReserved,
  [Action.FX_TIMEOUT_RESERVED]: QueryTags.operation.fxTimeoutReserved,
  [Action.PREPARE]: QueryTags.operation.prepareTransfer,
  [Action.FX_PREPARE]: QueryTags.operation.prepareFxTransfer,
  [Action.PREPARE_DUPLICATE]: QueryTags.operation.prepareTransferDuplicate,
  [Action.FX_PREPARE_DUPLICATE]: QueryTags.operation.prepareFxTransferDuplicate,
  [Action.FULFIL]: QueryTags.operation.fulfilTransfer,
  [Action.FX_FULFIL]: QueryTags.operation.fulfilFxTransfer,
  [Action.FULFIL_DUPLICATE]: QueryTags.operation.fulfilDuplicateTransfer,
  [Action.FX_FULFIL_DUPLICATE]: QueryTags.operation.fulfilDuplicateFxTransfer,
  [Action.FORWARDED]: QueryTags.operation.forwardedTransfer,
  [Action.FX_FORWARDED]: QueryTags.operation.forwardedFxTransfer,
  [Action.RESERVED_ABORTED]: QueryTags.operation.reservedAbortedTransfer,
  [Action.FX_RESERVED_ABORTED]: QueryTags.operation.reservedAbortedFxTransfer,
  [Action.GET]: QueryTags.operation.getTransferByID,
  [Action.FX_GET]: QueryTags.operation.getFxTransferByID,
  [Action.FX_NOTIFY]: QueryTags.operation.notifyFxTransfer
})

const getAuditOperationForAction = (action) => {
  const ops = actionsOperationsMap[action]
  if (!ops) {
    throw new Error(`No audit operation found for action: ${action}`)
  }
  return ops
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
  const tags = getQueryTags(
    serviceName,
    auditType,
    contentType,
    operation || getAuditOperationForAction(action),
    {
      httpMethod: method,
      ...(url ? { httpUrl: url } : {}),
      ...(path ? { httpPath: path } : {}),
      ...(isFx ? { commitRequestId: id } : { transferId: id }),
      ...(isFx ? { conversionId: id } : {}),
      ...(additionalTags.determiningTransferId ? { transactionId: additionalTags.determiningTransferId } : {}),
      ...additionalTags
    }
  )
  span.setTags(tags)
}

module.exports = {
  setProp,
  pathForInterface,
  injectAuditQueryTags,
  getAuditOperationForAction
}
