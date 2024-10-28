const { API_TYPES } = require('@mojaloop/central-services-shared').Util.Hapi

const ROUTES = Object.freeze({
  fxTransfers: '/fxTransfers'
})

const ROUTE_IDS = Object.freeze({
  postFxTransfers: 'ml_fxTransfer_prepare',
  putFxTransfers: 'ml_fxTransfer_fulfill',
  putFxTransfersError: 'ml_fxTransfer_abort',
  patchFxTransfers: 'ml_fxTransfer_patch',
  getFxTransfers: 'ml_fxTransfer_getById'
})

const FX_METRIC_PREFIX = 'fx_'

const PROM_METRICS = Object.freeze({
  transferGet: (isFx) => `${isFx ? FX_METRIC_PREFIX : ''}transfer_get`,
  transferPrepare: (isFx) => `${isFx ? FX_METRIC_PREFIX : ''}transfer_prepare`,
  transferFulfil: (isFx) => `${isFx ? FX_METRIC_PREFIX : ''}transfer_fulfil`,
  transferFulfilError: (isFx) => `${isFx ? FX_METRIC_PREFIX : ''}transfer_fulfil_error`,
  transferPatch: (isFx) => `${isFx ? FX_METRIC_PREFIX : ''}transfer_patch`
})

const TEMPLATE_PARAMS = Object.freeze({
  transferId: 'transferId',
  commitRequestId: 'commitRequestId'
})

module.exports = {
  API_TYPES,
  ROUTES,
  ROUTE_IDS,
  PROM_METRICS,
  TEMPLATE_PARAMS
}
