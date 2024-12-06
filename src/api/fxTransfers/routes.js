/*****
 License
 --------------
 Copyright © 2020-2024 Mojaloop Foundation
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

const { Enum } = require('@mojaloop/central-services-shared')
const { validateIncomingErrorCode } = require('@mojaloop/central-services-error-handling').Handler

const { ROUTES, ROUTE_IDS } = require('../../shared/constants')
const handler = require('../transfers/handler')
const schemas = require('../validationSchemas')

const tags = ['api', 'fxTransfers', Enum.Tags.RouteTags.SAMPLED]

module.exports = [
  {
    method: 'POST',
    path: ROUTES.fxTransfers,
    handler: handler.create,
    options: {
      validate: {
        headers: schemas.transferHeadersSchema,
        payload: schemas.fxTransfersPreparePayloadSchema
      },
      payload: {
        failAction: 'error'
      },
      id: ROUTE_IDS.postFxTransfers,
      description: 'POST FX Transfers request to FXP to execute the agreed currency conversion',
      tags
    }
  },
  {
    method: 'PUT',
    path: `${ROUTES.fxTransfers}/{id}`,
    handler: handler.fulfilTransfer,
    options: {
      validate: {
        headers: schemas.transferHeadersSchema,
        payload: schemas.fxTransfersSuccessCallbackPayloadSchema,
        params: schemas.commonSchemas.pathIdParamSchema
      },
      payload: {
        failAction: 'error'
      },
      id: ROUTE_IDS.putFxTransfers,
      description: 'Fulfil an FX Transfer',
      tags
    }
  },
  {
    method: 'PUT',
    path: `${ROUTES.fxTransfers}/{id}/error`,
    handler: handler.fulfilTransferError,
    options: {
      pre: [
        { method: validateIncomingErrorCode }
      ],
      validate: {
        headers: schemas.transferHeadersSchema,
        payload: schemas.commonSchemas.errorCallbackPayloadSchema,
        params: schemas.commonSchemas.pathIdParamSchema
      },
      payload: {
        failAction: 'error'
      },
      id: ROUTE_IDS.putFxTransfersError,
      tags,
      description: 'Abort an FX transfer'
    }
  },
  {
    method: 'GET',
    path: `${ROUTES.fxTransfers}/{id}`,
    handler: handler.getTransferById,
    options: {
      validate: {
        headers: schemas.transferHeadersSchema,
        params: schemas.commonSchemas.pathIdParamSchema
      },
      id: ROUTE_IDS.getFxTransfers,
      tags,
      description: 'Get an FX transfer'
    }
  },
  {
    method: 'PATCH',
    path: `${ROUTES.fxTransfers}/{id}`,
    handler: handler.patchTransfer,
    options: {
      validate: {
        headers: schemas.transferHeadersSchema,
        payload: schemas.fxTransfersPatchPayloadSchema,
        params: schemas.commonSchemas.pathIdParamSchema
      },
      payload: {
        failAction: 'error'
      },
      id: ROUTE_IDS.patchFxTransfers,
      tags,
      description: 'Patch an FX transfer'
    }
  }
]
