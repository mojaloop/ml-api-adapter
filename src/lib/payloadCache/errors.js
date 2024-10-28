class PayloadCacheError extends Error {
  constructor (message) {
    super(message)
    Error.captureStackTrace(this, this.constructor)
    this.name = this.constructor.name
  }

  static unsupportedPayloadCacheType () {
    return new PayloadCacheError('ERROR_MESSAGES.unsupportedPayloadCacheType')
  }
}

module.exports = PayloadCacheError
