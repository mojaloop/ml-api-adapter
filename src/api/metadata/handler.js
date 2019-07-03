'use strict'

const HealthCheck = require('@mojaloop/central-services-shared').HealthCheck.HealthCheck
const { defaultHealthHandler } = require('@mojaloop/central-services-health')

const packageJson = require('../../../package.json')
const Config = require('../../lib/config')
const {
  getSubServiceHealthBroker,
  getSubServiceHealthCentralLedger
} = require('../../lib/healthCheck/subServiceHealth.js')

const healthCheck = new HealthCheck(packageJson, [
  getSubServiceHealthBroker,
  getSubServiceHealthCentralLedger
])

/**
 * @module src/api/metadata/handler
 */

/**
 * @function ExtractUrls
 * @async
 *
 * @description This function returns the registered URLs on this server
 *
 * @param {object} request - the http request object
 *
 * @returns {object} - Returns the object containing all the registered URLs
 */

const extractUrls = (request) => {
  const urls = {}
  request.server.table()[0].table.filter(route => {
    return route.settings.id !== undefined &&
      Array.isArray(route.settings.tags) &&
      route.settings.tags.indexOf('api') >= 0
  }).forEach(route => {
    urls[route.settings.id] = `${Config.HOSTNAME}${route.path.replace(/\{/g, ':').replace(/\}/g, '')}`
  })
  return urls
}

/**
 * @function getHealth
 *
 * @description Get the health of the service
 *
 * @param {*} request - the Hapi request object
 * @param {*} h - the Hapi handler object
 */
const getHealth = defaultHealthHandler(healthCheck)

/**
 * @function metadata
 * @async
 *
 * @description This is the handler for / endpoint
 *
 * @param {object} request - the http request object
 * @param {object} h - the http response object
 *
 * @returns {object} - Returns the object containing the hostname, registered URLs and 200 status code
 */
const metadata = (request, h) => {
  return h.response({
    directory: Config.HOSTNAME,
    urls: extractUrls(request)
  }).code(200)
}

module.exports = {
  metadata,
  getHealth
}
