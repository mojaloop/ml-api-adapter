'use strict'

const Config = require('../../lib/config')

exports.strategy = (optional = false) => {
  if (!Config.ENABLE_TOKEN_AUTH && !Config.ENABLE_BASIC_AUTH) {
    return false
  }
  
}

