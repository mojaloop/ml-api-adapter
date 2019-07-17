const RC = require('rc')('MLAPI', require('../../config/default.json'))

// Set config object to be returned
const config = {
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
  ENDPOINT_HEALTH_URL: RC.ENDPOINT_HEALTH_URL,
  INSTRUMENTATION_METRICS_DISABLED: RC.INSTRUMENTATION.METRICS.DISABLED,
  INSTRUMENTATION_METRICS_CONFIG: RC.INSTRUMENTATION.METRICS.config,
  ENDPOINT_SECURITY: RC.ENDPOINT_SECURITY,
  ENDPOINT_SECURITY_TLS: RC.ENDPOINT_SECURITY.TLS,
  MAX_FULFIL_TIMEOUT_DURATION_SECONDS: RC.MAX_FULFIL_TIMEOUT_DURATION_SECONDS
}

module.exports = config
