const RC = require('rc')('MLAPI', require('../../config/default.json'))

// Set config object to be returned
let config = {
  HOSTNAME: RC.HOSTNAME.replace(/\/$/, ''),
  PORT: RC.PORT,
  AMOUNT: RC.AMOUNT,
  DFSP_URLS: RC.DFSP_URLS,
  HANDLERS: RC.HANDLERS,
  HANDLERS_DISABLED: RC.HANDLERS.DISABLED,
  HANDLERS_API: RC.HANDLERS.API,
  HANDLERS_API_DISABLED: RC.HANDLERS.API.DISABLED,
  KAFKA_CONFIG: RC.KAFKA,
  ENDPOINT_CACHE_CONFIG: RC.ENDPOINT_CACHE_CONFIG,
  ENDPOINT_SOURCE_URL: RC.ENDPOINT_SOURCE_URL,
  INSTRUMENTATION_METRICS_DISABLED: RC.INSTRUMENTATION.METRICS.DISABLED,
  INSTRUMENTATION_METRICS_CONFIG: RC.INSTRUMENTATION.METRICS.config,
  ENDPOINT_SECURITY: RC.SECURITY,
  ENDPOINT_SECURITY_TLS: RC.ENDPOINT_SECURITY.TLS
}

// Handle any defaults here
if (!RC.hasOwnProperty('ENDPOINT_SECURITY') || !RC.hasOwnProperty('ENDPOINT_SECURITY_TLS') || !RC.ENDPOINT_SECURITY_TLS.hasOwnProperty('rejectUnauthorized')) {
  config.rejectUnauthorized = true
}

module.exports = config
