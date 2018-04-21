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

const Db = require('../db')
const Uuid = require('uuid4')

class KnexStore {
  constructor () {
    this._getNextSequenceNumber = this._getNextSequenceNumber.bind(this)
    this._toDomainEvent = this._toDomainEvent.bind(this)
    this._insertDomainEvent = this._insertDomainEvent.bind(this)
    this._findDomainEvents = this._findDomainEvents.bind(this)
  }

  _findDomainEvents (criteria, callback) {
    return Db.from(this._tableName)
      .find(criteria)
      .then(results => callback(null, results.map(this._toDomainEvent)))
      .catch(e => callback(e, null))
  }

  _getNextSequenceNumber (domainEvent) {
    return Db.from(this._tableName)
      .max({ aggregateId: domainEvent.aggregate.id }, 'sequenceNumber')
      .then(max => {
        if (domainEvent.ensureIsFirstDomainEvent || max === null) {
          return 1
        } else {
          return max + 1
        }
      })
  }

  _toDomainEvent (event) {
    return {
      id: event.sequenceNumber,
      name: event.name,
      payload: event.payload,
      aggregate: { id: event.aggregateId, name: event.aggregateName },
      context: this._context.name,
      timestamp: (new Date(event.timestamp)).getTime()
    }
  }

  _insertDomainEvent (sequenceNumber, domainEvent) {
    return Db.from(this._tableName).insert({
      eventId: Uuid(),
      name: domainEvent.name,
      payload: domainEvent.payload,
      aggregateId: domainEvent.aggregate.id,
      aggregateName: domainEvent.aggregate.name,
      sequenceNumber: sequenceNumber,
      timestamp: (new Date(domainEvent.timestamp)).toISOString()
    })
  }

  initialize (context) {
    this._context = context
    return Promise.resolve().then(() => {
      this._tableName = this._context.name[0].toLowerCase() + this._context.name.substr(1) + 'DomainEvents'
      return this
    })
  }

  saveDomainEvent (domainEvent) {
    return this._getNextSequenceNumber(domainEvent).then(sequenceNumber => this._insertDomainEvent(sequenceNumber, domainEvent))
      .then(result => this._toDomainEvent(result))
  }

  findDomainEventsByName (domainEventNames, callback) {
    this._findDomainEvents({ name: [].concat(domainEventNames) }, callback)
  }

  findDomainEventsByAggregateId (aggregateIds, callback) {
    this._findDomainEvents({ aggregateId: [].concat(aggregateIds) }, callback)
  }

  findDomainEventsByNameAndAggregateId (domainEventNames, aggregateIds, callback) {
    this._findDomainEvents({ name: [].concat(domainEventNames), aggregateId: [].concat(aggregateIds) }, callback)
  }

  destroy () { }
}

exports.default = KnexStore
