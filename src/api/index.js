'use strict'

const Logger = require('@mojaloop/central-services-shared').Logger
const Config = require('../lib/config')
const Routes = require('./routes')
const Auth = require('./auth')

const Setup = require('../shared/setup')

module.exports = Setup.initialize({ service: 'api', port: Config.API_PORT, modules: [Routes] })
  .then(server => server.start().then(() => {
    Logger.info('Server running at: %s', server.info.uri)
  }))
