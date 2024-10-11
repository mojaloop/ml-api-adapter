const { getHealth, metadata } = require('../api/metadata/handler')
const { metrics } = require('../api/metrics/handler')
const { deleteEndpointCache } = require('../api/endpointcache/handler')
const TransferHandler = require('../api/transfers/handler')
const OpenapiBackend = require('@mojaloop/central-services-shared').Util.OpenapiBackend

module.exports.ApiHandlers = {
  HealthGet: getHealth,
  MetadataGet: metadata,
  MetricsGet: metrics,
  EndpointCacheDelete: deleteEndpointCache,
  transfers: TransferHandler.create,
  TransfersByIDGet: TransferHandler.getTransferById,
  TransfersByIDPatch: TransferHandler.patchTransfer,
  TransfersByIDPut: TransferHandler.fulfilTransfer,
  TransfersByIDAndError: TransferHandler.fulfilTransferError,
  FxTransfersPost: TransferHandler.create,
  FxTransfersByIDGet: TransferHandler.getTransferById,
  FxTransfersByIDPatch: TransferHandler.patchTransfer,
  FxTransfersByIDPut: TransferHandler.fulfilTransfer,
  FxTransfersByIDAndErrorPut: TransferHandler.fulfilTransferError,
  validationFail: OpenapiBackend.validationFail,
  notFound: OpenapiBackend.notFound,
  methodNotAllowed: OpenapiBackend.methodNotAllowed
}

module.exports.AdminHandlers = {
  HealthGet: getHealth,
  MetadataGet: metadata,
  MetricsGet: metrics,
  EndpointCacheDelete: deleteEndpointCache,
  validationFail: OpenapiBackend.validationFail,
  notFound: OpenapiBackend.notFound,
  methodNotAllowed: OpenapiBackend.methodNotAllowed
}
