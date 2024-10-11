const { loggerFactory } = require('@mojaloop/central-services-logger/src/contextLogger')

const logger = loggerFactory('ML-API') // global logger

module.exports = {
  loggerFactory,
  logger
}
