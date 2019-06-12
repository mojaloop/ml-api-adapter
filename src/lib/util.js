'use strict'

const _ = require('lodash')
const Crypto = require('crypto')
const Config = require('./config')

const omitNil = (object) => {
  return _.omitBy(object, _.isNil)
}

const pick = (object, properties) => {
  return _.pick(object, properties)
}

const assign = (target, source) => {
  return Object.assign(target, source)
}

const merge = (target, source) => {
  return Object.assign({}, target, source)
}

const mergeAndOmitNil = (target, source) => {
  return omitNil(merge(target, source))
}

const formatAmount = (amount) => {
  return Number(amount).toFixed(Config.AMOUNT.SCALE).toString()
}

const parseJson = (value) => {
  if (typeof value !== 'string') {
    return value
  }

  try {
    return JSON.parse(value)
  } catch (e) {
    return value
  }
}

const squish = (array) => {
  return _.join(array, '|')
}

const expand = (value) => {
  return (value) ? _.split(value, '|') : value
}

const filterUndefined = (fields) => {
  for (let key in fields) {
    if (fields[key] === undefined) {
      delete fields[key]
    }
  }
  return fields
}

/**
 * Method to provide object clonning
 *
 * TODO:
 *  Implement a better deep copy method
 *
 * @param value
 * @returns {any}
 */
const clone = (value) => {
  return JSON.parse(JSON.stringify(value))
}

/**
 * Method to delete a field from an object, using case insensitive comparison
 *
 * TODO:
 *  Implement a better delete method
 *
 * @param obj Object to have specified field deleted from
 * @param key Key to be deleted from the target Object
 */
const deleteFieldByCaseInsensitiveKey = (obj, key) => {
  for (var objKey in obj) {
    switch (objKey.toLowerCase()) {
      case (key.toLowerCase()):
        delete obj[objKey]
        break
      default:
        break
    }
  }
}

/**
 * Method to get a value based on a field (key) from an object, using case insensitive comparison
 *
 * TODO:
 *  Implement a better get method
 *
 * @param obj Object to have specified field searched for
 * @param key Key to be compared using case insensitive comparison
 * @returns value from case insensitive comparison search
 */
const getValueByCaseInsensitiveKey = (obj, key) => {
  return obj[Object.keys(obj).find(objKey => objKey.toLowerCase() === key.toLowerCase())]
}

/**
 * Method to set a value based on a field (key) from an object, using case insensitive comparison
 *
 * TODO:
 *  Implement a better set method
 *
 * @param obj Object to have specified field searched for
 * @param key Key to be compared using case insensitive comparison
 * @param value Value to be assigned to the associated key map
 * @returns value from case insensitive comparison search
 */
const setValueByCaseInsensitiveKey = (obj, key, value) => {
  for (var objKey in obj) {
    switch (objKey.toLowerCase()) {
      case (key.toLowerCase()):
        obj[objKey] = value
        break
      default:
        break
    }
  }
}

/**
 * Method to create the hash for a given payload
 *
 * @param payload Payload for which a hash is to be create
 * @returns Hash for the provided payload
 */
const createHash = (payload) => {
  const hashSha256 = Crypto.createHash('sha256')
  let hash = JSON.stringify(payload)
  hash = hashSha256.update(hash)
  hash = hashSha256.digest(hash).toString('base64').slice(0, -1) // removing the trailing '=' as per the specification
  return hash
}

module.exports = {
  assign,
  expand,
  formatAmount,
  merge,
  mergeAndOmitNil,
  omitNil,
  parseJson,
  pick,
  squish,
  filterUndefined,
  clone,
  deleteFieldByCaseInsensitiveKey,
  getValueByCaseInsensitiveKey,
  setValueByCaseInsensitiveKey,
  createHash
}
