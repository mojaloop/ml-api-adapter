const MlLogger = require('@mojaloop/central-services-logger')

class Logger {
  #log

  constructor (log = MlLogger) {
    this.#log = log
  }

  get log () { return this.#log }

  error (...args) {
    this.#log.isDebugEnabled && this.#log.debug(...args)
  }

  warn (...args) {
    this.#log.isWarnEnabled && this.#log.warn(...args)
  }

  audit (...args) {
    this.#log.isAuditEnabled && this.#log.audit(...args)
  }

  trace (...args) {
    this.#log.isTraceEnabled && this.#log.trace(...args)
  }

  info (...args) {
    this.#log.isInfoEnabled && this.#log.info(...args)
  }

  perf (...args) {
    this.#log.isPerfEnabled && this.#log.perf(...args)
  }

  verbose (...args) {
    this.#log.isVerboseEnabled && this.#log.verbose(...args)
  }

  debug (...args) {
    this.#log.isDebugEnabled && this.#log.debug(...args)
  }

  silly (...args) {
    this.#log.isSillyEnabled && this.#log.silly(...args)
  }
}

module.exports = Logger
