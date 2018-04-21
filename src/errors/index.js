/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>
 
 --------------
 ******/

'use strict'

const SharedErrors = require('@mojaloop/central-services-shared')
const AggregateNotFoundError = require('./aggregate-not-found-error')
const AlreadyRolledBackError = require('./already-rolled-back')
const ExpiredTransferError = require('./expired-transfer-error')
const InvalidBodyError = require('./invalid-body')
const InvalidModificationError = require('./invalid-modification')
const MissingFulfillmentError = require('./missing-fulfillment')
const RecordExistsError = require('./record-exists-error')
const TransferNotConditionalError = require('./transfer-not-conditional')
const TransferNotFoundError = require('./transfer-not-found')
const UnauthorizedError = require('./unauthorized')
const UnexecutedTransferError = require('./unexecuted-transfer-error')
const UnmetConditionError = require('./unmet-condition')
const UnpreparedTransferError = require('./unprepared-transfer-error')
const ValidationError = require('./validation-error')

module.exports = {
  AggregateNotFoundError,
  AlreadyRolledBackError,
  ExpiredTransferError,
  InvalidBodyError,
  InvalidModificationError,
  MissingFulfillmentError,
  RecordExistsError,
  TransferNotConditionalError,
  TransferNotFoundError,
  UnauthorizedError,
  UnexecutedTransferError,
  UnmetConditionError,
  UnpreparedTransferError,
  ValidationError,
  NotFoundError: SharedErrors.NotFoundError
}
