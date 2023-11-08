const ROUTES = Object.freeze({
  fxTransfers: '/fxTransfers'
})

const ROUTE_IDS = Object.freeze({
  postFxTransfers: 'ml_fxTransfer_prepare',
  putFxTransfers: 'ml_fxTransfer_fulfill',
  putFxTransfersError: 'ml_fxTransfer_abort',
  getFxTransfers: 'ml_fxTransfer_getById'
})

module.exports = {
  ROUTES,
  ROUTE_IDS
}
