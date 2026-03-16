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
