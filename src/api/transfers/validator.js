'use strict'

const P = require('bluebird')
const Decimal = require('decimal.js')
const Config = require('../../lib/config')
const UrlParser = require('../../lib/urlparser')
const Account = require('../../domain/account')
const ValidationError = require('../../errors').ValidationError
const Logger = require('@mojaloop/central-services-shared').Logger

const allowedScale = Config.AMOUNT.SCALE
const allowedPrecision = Config.AMOUNT.PRECISION

const validateEntry = (entry) => {
  const accountName = UrlParser.nameFromAccountUri(entry.account)
  if (!accountName) {
    throw new ValidationError(`Invalid account URI: ${entry.account}`)
  }

  const decimalAmount = new Decimal(entry.amount)

  if (decimalAmount.decimalPlaces() > allowedScale) {
    throw new ValidationError(`Amount ${entry.amount} exceeds allowed scale of ${allowedScale}`)
  }

  if (decimalAmount.precision(true) > allowedPrecision) {
    throw new ValidationError(`Amount ${entry.amount} exceeds allowed precision of ${allowedPrecision}`)
  }

  return { accountName, decimalAmount }
}


