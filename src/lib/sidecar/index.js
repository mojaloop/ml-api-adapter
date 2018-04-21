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

const Client = require('@mojaloop/forensic-logging-client')
const NullClient = require('./null-client')
const Config = require('../config')
const Moment = require('moment')

const sidecar = createClient()

function createClient () {
  if (Config.SIDECAR_DISABLED) {
    return NullClient.create()
  }

  let sc = Client.create({
    host: Config.SIDECAR.HOST,
    port: Config.SIDECAR.PORT,
    connectTimeout: Config.SIDECAR.CONNECT_TIMEOUT,
    reconnectInterval: Config.SIDECAR.RECONNECT_INTERVAL
  })

  sc.on('close', () => {
    throw new Error('Sidecar connection closed')
  })

  return sc
}

exports.connect = () => {
  return sidecar.connect()
}

exports.write = (msg) => {
  return sidecar.write(msg)
}

exports.logRequest = (request) => {
  const msg = {
    method: request.method,
    timestamp: Moment.utc().toISOString(),
    url: request.url.path,
    body: request.body,
    auth: request.auth
  }
  return sidecar.write(JSON.stringify(msg))
}
