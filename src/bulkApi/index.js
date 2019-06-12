const Setup = require('./server')
const Config = require('../../src/lib/config')

module.exports = Setup.initialize({
  service: 'bulk-api',
  port: Config.BULK.PORT
})
