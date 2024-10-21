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
