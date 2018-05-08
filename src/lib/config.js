const RC = require('rc')('CLEDG', require('../../config/default.json'))

module.exports = {
  HOSTNAME: RC.HOSTNAME.replace(/\/$/, ''),
  PORT: RC.PORT,
  DFSP_URLS: RC.DFSP_URLS,
  KAFKA_HOST: RC.KAFKA_HOST,
  KAFKA_BROKER_PORT: RC.KAFKA_BROKER_PORT
}
