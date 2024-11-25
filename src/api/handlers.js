const { getHealth, metadata } = require('./metadata/handler')
const { deleteEndpointCache } = require('./endpointcache/handler')
const TransferHandler = require('./transfers/handler')
const OpenapiBackend = require('@mojaloop/central-services-shared').Util.OpenapiBackend

module.exports.ApiHandlers = {
  HealthGet: getHealth,
  MetadataGet: metadata,
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
