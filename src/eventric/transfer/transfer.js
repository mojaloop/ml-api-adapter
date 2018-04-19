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

const Moment = require('moment')
const TransferState = require('../../domain/transfer/state')
const TransferRejectionType = require('../../domain/transfer/rejection-type')

class Transfer {
  create ({
    ledger,
    debits,
    credits,
    execution_condition,
    expires_at
  }) {
    const payload = {
      ledger,
      debits,
      credits
    }

    if (execution_condition) { // eslint-disable-line
      payload.execution_condition = execution_condition // eslint-disable-line
      payload.expires_at = expires_at // eslint-disable-line
      return this._emitTransferPrepared(payload)
    } else {
      this._emitTransferPrepared(payload)
      return this._emitTransferExecuted({})
    }
  }

  fulfill (payload) {
    return this._emitTransferExecuted(payload)
  }

  reject (payload) {
    return this._emitTransferRejected(payload)
  }

  settle (payload) {
    return this._emitTransferSettled(payload)
  }

  _emitTransferPrepared (payload) {
    return this.$emitDomainEvent('TransferPrepared', payload)
  }

  _emitTransferExecuted (payload) {
    return this.$emitDomainEvent('TransferExecuted', payload)
  }

  _emitTransferRejected (payload) {
    return this.$emitDomainEvent('TransferRejected', payload)
  }

  _emitTransferSettled (payload) {
    return this.$emitDomainEvent('TransferSettled', payload)
  }

  handleTransferPrepared (event) {
    this.id = event.aggregate.id
    this.ledger = event.payload.ledger
    this.debits = event.payload.debits
    this.credits = event.payload.credits
    this.execution_condition = event.payload.execution_condition
    this.expires_at = event.payload.expires_at
    this.state = TransferState.PREPARED
    this.timeline = {
      prepared_at: Moment(event.timestamp).toISOString()
    }
    return this
  }

  handleTransferExecuted (event) {
    this.state = TransferState.EXECUTED
    this.fulfillment = event.payload.fulfillment
    this.timeline = this.timeline || {}
    this.timeline.executed_at = Moment(event.timestamp).toISOString()
    return this
  }

  handleTransferRejected ({timestamp, payload}) {
    const reason = payload.rejection_reason // eslint-disable-line
    this.state = TransferState.REJECTED
    this.rejection_reason = reason // eslint-disable-line
    this.timeline = this.timeline || {}
    this.timeline.rejected_at = new Date(timestamp).toISOString()
    if (reason === TransferRejectionType.CANCELLED && this.credits) {
      this.credits[0].rejected = true
      this.credits[0].rejection_message = payload.message || ''
    }
    return this
  }

  handleTransferSettled (event) {
    this.state = TransferState.SETTLED
    this.settlement_id = event.payload.settlement_id
    return this
  }
}

module.exports = Transfer
