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
 Mojaloop Foundation for an example). Those individuals should be
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * Infitx
 - Kevin Leyow <kevin.leyow@infitx.com>

 --------------
 ******/

'use strict'

const http = require('http')
const https = require('https')
const { logger } = require('../shared/logger')

/**
 * HTTP/HTTPS Agent Manager
 * Provides shared agents for connection pooling to improve callback delivery performance
 */

let httpAgent = null
let httpsAgent = null

/**
 * Create and initialize shared HTTP agents with connection pooling
 * @param {object} config - Configuration object
 * @param {number} [config.maxSockets=256] - Maximum number of sockets to maintain per agent
 * @param {number} [config.maxFreeSockets=256] - Maximum number of free sockets to keep open
 * @param {number} [config.socketTimeout=60000] - Socket timeout in milliseconds
 * @returns {object} { httpAgent, httpsAgent }
 */
const initializeAgents = (config = {}) => {
  const maxSockets = config.maxSockets || 256
  const maxFreeSockets = config.maxFreeSockets || 256
  const socketTimeout = config.socketTimeout || 60000

  const agentOptions = {
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets,
    maxFreeSockets,
    timeout: socketTimeout
  }

  httpAgent = new http.Agent(agentOptions)
  httpsAgent = new https.Agent(agentOptions)

  // Prevent logging of agent internals
  httpAgent.toJSON = () => ({ type: 'SharedHttpAgent', keepAlive: true, maxSockets })
  httpsAgent.toJSON = () => ({ type: 'SharedHttpsAgent', keepAlive: true, maxSockets })

  logger.info(`HTTP agents initialized with maxSockets: ${maxSockets}, maxFreeSockets: ${maxFreeSockets}, socketTimeout: ${socketTimeout}ms`)

  return { httpAgent, httpsAgent }
}

/**
 * Get the shared HTTP agent
 * @returns {http.Agent}
 */
const getHttpAgent = () => {
  if (!httpAgent) {
    initializeAgents()
  }
  return httpAgent
}

/**
 * Get the shared HTTPS agent
 * @returns {https.Agent}
 */
const getHttpsAgent = () => {
  if (!httpsAgent) {
    initializeAgents()
  }
  return httpsAgent
}

/**
 * Get both HTTP and HTTPS agents
 * @returns {object} { httpAgent, httpsAgent }
 */
const getAgents = () => {
  return {
    httpAgent: getHttpAgent(),
    httpsAgent: getHttpsAgent()
  }
}

/**
 * Destroy all agents (useful for cleanup)
 */
const destroyAgents = () => {
  if (httpAgent) {
    httpAgent.destroy()
    httpAgent = null
  }
  if (httpsAgent) {
    httpsAgent.destroy()
    httpsAgent = null
  }
  logger.debug('HTTP agents destroyed')
}

module.exports = {
  initializeAgents,
  getHttpAgent,
  getHttpsAgent,
  getAgents,
  destroyAgents
}
