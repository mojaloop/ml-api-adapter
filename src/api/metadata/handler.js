'use strict'

const Config = require('../../lib/config')

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
 * @function health
 * @async
 *
 * @description This is the handler for /health endpoint
 *
 * @param {object} request - the http request object
 * @param {object} h - the http response object
 *
 * @returns {object} - Returns the object containing the OK status and 200 status code
 */
exports.health = function (request, h) {
  return h.response({ status: 'OK' }).code(200)
}

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
exports.metadata = function (request, h) {
  return h.response({
    directory: Config.HOSTNAME,
    urls: extractUrls(request)
  }).code(200)
}
