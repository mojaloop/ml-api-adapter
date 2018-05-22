const RC = require('rc')('MLAPI', require('../../config/default.json'))

module.exports = {
  HOSTNAME: RC.HOSTNAME.replace(/\/$/, ''),
  PORT: RC.PORT,
  DFSP_URLS: RC.DFSP_URLS,
  KAFKA_CONFIG: RC.KAFKA
}
