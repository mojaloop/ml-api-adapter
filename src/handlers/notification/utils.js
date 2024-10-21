const ErrorHandler = require('@mojaloop/central-services-error-handling')

const getRecursiveCause = (error) => {
  if (error.cause instanceof ErrorHandler.Factory.FSPIOPError) {
    return getRecursiveCause(error.cause)
  } else if (error.cause) {
    return error.cause
  } else if (error.message) {
    return error.message
  } else {
    return error
  }
}

module.exports = {
  getRecursiveCause
}
