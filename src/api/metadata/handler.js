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
  //TODO: Health check 



  /* 

  Health status design:

  Design Goals:
  - Clear HTTP Statuses (no need to inspect the response to know there are no issues)
    - if response status is 200, then all good, everything is fine
    - if status is 502, then API is good, but services maybe not. This may be the case when restarting the database, or when the api has started but not the database
      502 is reserved for Bad Gateway, which I think kind of suits this case, but requires a bit of a loose interpretation of Gateway...
    - if status is 503, then status is bad - the api won't be up and

  example good status
  GET /health 
  200
  {
    status: 'OK',
    uptime: number, (seconds),
    upSince: string, (ISODate),
    versionNumber: string, (from package.json)
    services: [
      {
        name: 'kafka',
        connectionStatus: 'OK',
        latency: 12341 (ms)
      },
      {
        name: 'mysql',
        connectionStatus: 'OK',
        latency: 12341 (ms)
      }

    ],
  }

  example bad status
  503

  

  */

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
