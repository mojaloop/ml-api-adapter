const { Enum } = require('@mojaloop/central-services-shared')
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
      description: 'Fulfil a FX Transfer',
      tags
    }
  }
  // todo: add /error route
]
