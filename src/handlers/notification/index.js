/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Georgi Georgiev <georgi.georgiev@modusbox.com>
 * Shashikant Hirugade <shashikant.hirugade@modusbox.com>
 * Steven Oderayi <steven.oderayi@modusbox.com>

 --------------
 ******/
'use strict'

const Logger = require('@mojaloop/central-services-logger')
const EventSdk = require('@mojaloop/event-sdk')
const Metrics = require('@mojaloop/central-services-metrics')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const JwsSigner = require('@mojaloop/sdk-standard-components').Jws.signer
const { Consumer } = require('@mojaloop/central-services-stream').Kafka
const { Util, Enum } = require('@mojaloop/central-services-shared')

const { logger } = require('../../shared/logger')
const { createCallbackHeaders } = require('../../lib/headers')
const Participant = require('../../domain/participant')
const Config = require('../../lib/config')
const dto = require('./dto')
const utils = require('./utils')

const Callback = Util.Request
const { Action } = Enum.Events.Event
const { PATCH, POST, PUT } = Enum.Http.RestMethods
const { FspEndpointTypes, FspEndpointTemplates } = Enum.EndPoints

let notificationConsumer = {}
let autoCommitEnabled = true

const recordTxMetrics = (timeApiPrepare, timeApiFulfil, success) => {
  const endTime = Date.now()
  if (timeApiPrepare && !timeApiFulfil) {
    const histTracePrepareTimerEnd = Metrics.getHistogram(
      'tx_transfer_prepare',
      'Tranxaction metrics for Transfers - Prepare Flow',
      ['success']
    )
    histTracePrepareTimerEnd.observe({ success }, (endTime - timeApiPrepare) / 1000)
  }
  if (timeApiFulfil) {
    const histTraceFulfilTimerEnd = Metrics.getHistogram(
      'tx_transfer_fulfil',
      'Tranxaction metrics for Transfers - Fulfil Flow',
      ['success']
    )
    histTraceFulfilTimerEnd.observe({ success }, (endTime - timeApiFulfil) / 1000)
  }
  if (timeApiPrepare && timeApiFulfil) {
    const histTraceEnd2EndTimerEnd = Metrics.getHistogram(
      'tx_transfer',
      'Tranxaction metrics for Transfers - End-to-end Flow',
      ['success']
    )
    histTraceEnd2EndTimerEnd.observe({ success }, (endTime - timeApiPrepare) / 1000)
  }
}

/**
  * @module src/handlers/notification
  */

/**
  * @function startConsumer
  * @async
  * @description This will create a kafka consumer which will listen to the notification topics configured in the config
  *
  * @returns {boolean} Returns true on success and throws error on failure
  */
const startConsumer = async () => {
  const functionality = Enum.Events.Event.Type.NOTIFICATION
  const action = Action.EVENT

  let topicName
  try {
    const topicConfig = Util.Kafka.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, functionality, action)
    topicName = topicConfig.topicName
    logger.info(`Notification::startConsumer - starting Consumer for topicNames: [${topicName}]`)
    const config = Util.Kafka.getKafkaConfig(Config.KAFKA_CONFIG, Enum.Kafka.Config.CONSUMER, functionality.toUpperCase(), action.toUpperCase())
    config.rdkafkaConf['client.id'] = topicName

    if (config.rdkafkaConf['enable.auto.commit'] !== undefined) {
      autoCommitEnabled = config.rdkafkaConf['enable.auto.commit']
    }
    notificationConsumer = new Consumer([topicName], config)
    await notificationConsumer.connect()
    logger.info(`Notification::startConsumer - Kafka Consumer connected for topicNames: [${topicName}]`)
    await notificationConsumer.consume(consumeMessage)
    logger.info(`Notification::startConsumer - Kafka Consumer created for topicNames: [${topicName}]`)
    return true
  } catch (err) {
    logger.error(`Notification::startConsumer - error for topicNames: [${topicName}] - ${err}`)
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    logger.error(fspiopError)
    throw fspiopError
  }
}

/**
  * @function consumeMessage
  * @async
  * @description This is the callback function for the kafka consumer, this will receive the message from kafka, commit the message and send it for processing
  * processMessage - called to process the message received from kafka
  * @param {object} error - the error message received form kafka in case of error
  * @param {object} message - the message received form kafka

  * @returns {boolean} Returns true on success or false on failure
  */
const consumeMessage = async (error, message) => {
  logger.debug('Notification::consumeMessage')
  const histTimerEnd = Metrics.getHistogram(
    'notification_event',
    'Consume a notification message from the kafka topic and process it accordingly',
    ['success', 'error']
  ).startTimer()
  let timeApiPrepare
  let timeApiFulfil
  try {
    if (error) {
      const fspiopError = ErrorHandler.Factory.createInternalServerFSPIOPError(`Error while reading message from kafka ${error}`, error)
      logger.error(fspiopError)
      throw fspiopError
    }
    logger.debug('Notification:consumeMessage message:', message)

    message = (!Array.isArray(message) ? [message] : message)
    let combinedResult = true
    for (const msg of message) {
      logger.debug('Notification::consumeMessage::processMessage')
      const contextFromMessage = EventSdk.Tracer.extractContextFromMessage(msg.value)
      const span = EventSdk.Tracer.createChildSpanFromContext('ml_notification_event', contextFromMessage)
      const traceTags = span.getTracestateTags()
      if (traceTags.timeApiPrepare && parseInt(traceTags.timeApiPrepare)) timeApiPrepare = parseInt(traceTags.timeApiPrepare)
      if (traceTags.timeApiFulfil && parseInt(traceTags.timeApiFulfil)) timeApiFulfil = parseInt(traceTags.timeApiFulfil)
      try {
        await span.audit(msg, EventSdk.AuditEventAction.start)
        const res = await processMessage(msg, span).catch(err => {
          const fspiopError = ErrorHandler.Factory.createInternalServerFSPIOPError('Error processing notification message', err)
          logger.error(fspiopError)
          if (!autoCommitEnabled) {
            notificationConsumer.commitMessageSync(msg)
          }
          throw fspiopError // We return 'resolved' since we have dealt with the error here
        })
        if (!autoCommitEnabled) {
          notificationConsumer.commitMessageSync(msg)
        }
        logger.debug(`Notification:consumeMessage message processed: - ${res}`)
        combinedResult = (combinedResult && res)
      } catch (err) {
        const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
        const state = new EventSdk.EventStateMetadata(EventSdk.EventStatusType.failed, fspiopError.apiErrorCode.code, fspiopError.apiErrorCode.message)
        await span.error(fspiopError, state)
        await span.finish(fspiopError.message, state)
        throw fspiopError
      } finally {
        if (!span.isFinished) {
          await span.finish()
        }
      }
    }
    // TODO: calculate end times - report end-to-time
    //
    recordTxMetrics(timeApiPrepare, timeApiFulfil, true)
    histTimerEnd({ success: true })
    return combinedResult
  } catch (err) {
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    logger.error(fspiopError)
    recordTxMetrics(timeApiPrepare, timeApiFulfil, false)

    const errCause = utils.getRecursiveCause(err)
    histTimerEnd({ success: false, error: errCause })
    throw fspiopError
  }
}

/**
  * @function processMessage
  * @async
  * @description This is the function that will process the message received from kafka, it determined the action and status from the message and sends calls to appropriate fsp
  * Callback.sendCallback - called to send the notification callback
  * @param {object} msg - the message received form kafka
  * @param {object} span - the parent event span
  *
  * @returns {boolean} Returns true on success and throws error on failure
  */
const processMessage = async (msg, span) => {
  const histTimerEnd = Metrics.getHistogram(
    'notification_event_process_msg',
    'Consume a notification message from the kafka topic and process it accordingly',
    ['success', 'action']
  ).startTimer()

  logger.debug('Notification::processMessage')

  if (!msg.value || !msg.value.content || !msg.value.content.headers || !msg.value.content.payload) {
    histTimerEnd({ success: false, action: 'unknown' })
    throw ErrorHandler.Factory.createInternalServerFSPIOPError('Invalid message received from kafka')
  }

  const fromSwitch = true
  const {
    id,
    from,
    to,
    action,
    content,
    isFx,
    isSuccess,
    payloadForCallback
  } = dto.notificationMessageDto(msg)

  const REQUEST_TYPE = {
    POST: 'POST',
    PUT: 'PUT',
    PUT_ERROR: 'PUT_ERROR',
    PATCH: 'PATCH'
  }

  const getEndpointFn = async (fsp, requestType) => {
    let endpointType
    switch (requestType) {
      case REQUEST_TYPE.POST:
        endpointType = isFx
          ? FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_POST
          : FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_POST
        break
      case REQUEST_TYPE.PUT:
      case REQUEST_TYPE.PATCH:
        endpointType = isFx
          ? FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_PUT
          : FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT
        break
      case REQUEST_TYPE.PUT_ERROR:
        endpointType = isFx
          ? FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_ERROR
          : FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR
        break
      default:
        throw new Error('Invalid request type')
    }

    return Participant.getEndpoint({ fsp, endpointType, id, isFx, span })
  }

  const getEndpointTemplate = (requestType) => {
    switch (requestType) {
      case REQUEST_TYPE.POST:
        return isFx
          ? FspEndpointTemplates.FX_TRANSFERS_POST
          : FspEndpointTemplates.TRANSFERS_POST
      case REQUEST_TYPE.PUT:
      case REQUEST_TYPE.PATCH:
        return isFx
          ? FspEndpointTemplates.FX_TRANSFERS_PUT
          : FspEndpointTemplates.TRANSFERS_PUT
      case REQUEST_TYPE.PUT_ERROR:
        return isFx
          ? FspEndpointTemplates.FX_TRANSFERS_PUT_ERROR
          : FspEndpointTemplates.TRANSFERS_PUT_ERROR
      default:
        throw new Error('Invalid request type')
    }
  }

  // Injected Configuration for outbound Content-Type & Accept headers.
  const protocolVersions = {
    content: Config.PROTOCOL_VERSIONS.CONTENT.DEFAULT.toString(),
    accept: Config.PROTOCOL_VERSIONS.ACCEPT.DEFAULT.toString()
  }

  let jwsSigner = getJWSSigner(from)
  let callbackHeaders

  if ([Action.PREPARE, Action.FX_PREPARE].includes(action)) {
    if (!isSuccess) {
      const callbackURLTo = await getEndpointFn(to, REQUEST_TYPE.PUT_ERROR)
      const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT_ERROR)
      callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)

      logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
      await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, PUT, payloadForCallback, Enum.Http.ResponseTypes.JSON, span, jwsSigner, protocolVersions)
      histTimerEnd({ success: true, action })
      return true
    }

    const callbackURLTo = await getEndpointFn(to, REQUEST_TYPE.POST)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.POST)
    callbackHeaders = createCallbackHeaders({ headers: content.headers, httpMethod: POST, endpointTemplate })

    logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${POST}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    let response = { status: 'unknown' }
    const histTimerEndSendRequest = Metrics.getHistogram(
      'notification_event_delivery',
      'notification_event_delivery - metric for sending notification requests to FSPs',
      ['success', 'from', 'to', 'dest', 'action', 'status']
    ).startTimer()

    try {
      response = await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, POST, payloadForCallback, Enum.Http.ResponseTypes.JSON, span, null, protocolVersions)
    } catch (err) {
      logger.error(err)
      histTimerEndSendRequest({ success: false, from, dest: to, action, status: response.status })
      histTimerEnd({ success: false, action })
      throw err
    }
    histTimerEndSendRequest({ success: true, from, dest: to, action, status: response.status })
    histTimerEnd({ success: true, action })
    return true
  }

  if ([Action.PREPARE_DUPLICATE, Action.FX_PREPARE_DUPLICATE].includes(action) && isSuccess) {
    const callbackURLTo = await getEndpointFn(to, REQUEST_TYPE.PUT)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT)

    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
    logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, PUT, payloadForCallback, Enum.Http.ResponseTypes.JSON, span, jwsSigner, protocolVersions)
    return true
  }

  if ([Action.COMMIT, Action.RESERVE, Action.FX_COMMIT, Action.FX_RESERVE].includes(action) && isSuccess) {
    const callbackURLTo = await getEndpointFn(to, REQUEST_TYPE.PUT)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT)

    // forward the fulfil to the destination
    logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    let response = { status: 'unknown' }
    const histTimerEndSendRequest = Metrics.getHistogram(
      'notification_event_delivery',
      'notification_event_delivery - metric for sending notification requests to FSPs',
      ['success', 'from', 'dest', 'action', 'status']
    ).startTimer()
    try {
      if ([Action.RESERVE, Action.FX_RESERVE].includes(action)) {
        callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, true)
        jwsSigner = getJWSSigner(Enum.Http.Headers.FSPIOP.SWITCH.value)
        response = await Callback.sendRequest(callbackURLTo, callbackHeaders, Enum.Http.Headers.FSPIOP.SWITCH.value, to, PUT, payloadForCallback, Enum.Http.ResponseTypes.JSON, span, jwsSigner, protocolVersions)
      } else {
        callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, false)
        response = await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, PUT, payloadForCallback, Enum.Http.ResponseTypes.JSON, span, null, protocolVersions)
      }
    } catch (err) {
      histTimerEndSendRequest({ success: false, from, dest: to, action, status: response.status })
      histTimerEnd({ success: false, action })
      throw err
    }
    histTimerEndSendRequest({ success: true, from, dest: to, action, status: response.status })

    // send an extra notification back to the original sender (if enabled in config) and ignore this for on-us transfers
    // todo: do we need this case for FX_RESERVE ?
    if (([Action.RESERVE, Action.FX_RESERVE].includes(action)) || (Config.SEND_TRANSFER_CONFIRMATION_TO_PAYEE && from !== to)) {
      let payloadForPayee = JSON.parse(payloadForCallback)
      if (payloadForPayee.fulfilment && [Action.RESERVE, Action.FX_RESERVE].includes(action)) {
        delete payloadForPayee.fulfilment
      }
      payloadForPayee = JSON.stringify(payloadForPayee)
      const method = [Action.RESERVE, Action.FX_RESERVE].includes(action) ? PATCH : PUT
      const callbackURLFrom = await getEndpointFn(from, REQUEST_TYPE.PUT)
      logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLFrom}, ${method}, ${JSON.stringify(callbackHeaders)}, ${payloadForPayee}, ${id}, ${Enum.Http.Headers.FSPIOP.SWITCH.value}, ${from})`)

      callbackHeaders = createCallbackHeaders({ dfspId: from, transferId: id, headers: content.headers, httpMethod: method, endpointTemplate }, fromSwitch)
      const histTimerEndSendRequest2 = Metrics.getHistogram(
        'notification_event_delivery',
        'notification_event_delivery - metric for sending notification requests to FSPs',
        ['success', 'from', 'dest', 'action', 'status']
      ).startTimer()
      let rv
      try {
        jwsSigner = getJWSSigner(Enum.Http.Headers.FSPIOP.SWITCH.value)
        rv = await Callback.sendRequest(callbackURLFrom, callbackHeaders, Enum.Http.Headers.FSPIOP.SWITCH.value, from, method, payloadForPayee, Enum.Http.ResponseTypes.JSON, span, jwsSigner, protocolVersions)
      } catch (err) {
        histTimerEndSendRequest2({ success: false, dest: from, action, status: response.status })
        histTimerEnd({ success: false, action })
        throw err
      }
      histTimerEndSendRequest2({ success: true, dest: from, action, status: response.status })

      histTimerEnd({ success: true, action })
      return rv
    } else {
      logger.debug(`Notification::processMessage - Action: ${action} - Skipping notification callback to original sender (${from}) because feature is disabled in config.`)
      histTimerEnd({ success: true, action })
      return true
    }
  }

  if ([Action.COMMIT, Action.FX_COMMIT].includes(action) && !isSuccess) {
    const callbackURLTo = await getEndpointFn(to, REQUEST_TYPE.PUT_ERROR)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT_ERROR)

    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
    logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, PUT, payloadForCallback, Enum.Http.ResponseTypes.JSON, span, jwsSigner, protocolVersions)
    histTimerEnd({ success: true, action })
    return true
  }

  if ([Action.REJECT, Action.FX_REJECT].includes(action)) {
    const [callbackURLFrom, callbackURLTo] = await Promise.all([
      getEndpointFn(from, REQUEST_TYPE.PUT),
      getEndpointFn(to, REQUEST_TYPE.PUT)
    ])

    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT)
    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate })
    // forward the reject to the destination
    logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, PUT, payloadForCallback, Enum.Http.ResponseTypes.JSON, span, null, protocolVersions)

    // send an extra notification back to the original sender (if enabled in config) and ignore this for on-us transfers
    if (Config.SEND_TRANSFER_CONFIRMATION_TO_PAYEE && from !== to) {
      jwsSigner = getJWSSigner(Enum.Http.Headers.FSPIOP.SWITCH.value)
      logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLFrom}, ${PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${Enum.Http.Headers.FSPIOP.SWITCH.value}, ${from})`)
      callbackHeaders = createCallbackHeaders({ dfspId: from, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
      const response = await Callback.sendRequest(callbackURLFrom, callbackHeaders, Enum.Http.Headers.FSPIOP.SWITCH.value, from, PUT, payloadForCallback, Enum.Http.ResponseTypes.JSON, span, jwsSigner, protocolVersions)
      histTimerEnd({ success: true, action })
      return response
    } else {
      logger.info(`Notification::processMessage - Action: ${action} - Skipping notification callback to original sender (${from}) because feature is disabled in config.`)
    }
    histTimerEnd({ success: true, action })
    return true
  }

  if ([Action.ABORT, Action.FX_ABORT].includes(action)) {
    const [callbackURLFrom, callbackURLTo] = await Promise.all([
      getEndpointFn(from, REQUEST_TYPE.PUT_ERROR),
      getEndpointFn(to, REQUEST_TYPE.PUT_ERROR)
    ])

    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT_ERROR)
    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate })
    // forward the abort to the destination
    logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, PUT, payloadForCallback, Enum.Http.ResponseTypes.JSON, span, null, protocolVersions)

    // send an extra notification back to the original sender (if enabled in config) and ignore this for on-us transfers
    if (Config.SEND_TRANSFER_CONFIRMATION_TO_PAYEE && from !== to) {
      jwsSigner = getJWSSigner(Enum.Http.Headers.FSPIOP.SWITCH.value)
      logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLFrom}, ${PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${Enum.Http.Headers.FSPIOP.SWITCH.value}, ${from})`)
      callbackHeaders = createCallbackHeaders({ dfspId: from, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
      const response = await Callback.sendRequest(callbackURLFrom, callbackHeaders, Enum.Http.Headers.FSPIOP.SWITCH.value, from, PUT, payloadForCallback, Enum.Http.ResponseTypes.JSON, span, jwsSigner, protocolVersions)
      histTimerEnd({ success: true, action })
      return response
    } else {
      logger.info(`Notification::processMessage - Action: ${action} - Skipping notification callback to original sender (${from}).`)
    }
    histTimerEnd({ success: true, action })
    return true
  }

  if ([Action.ABORT_VALIDATION, Action.FX_ABORT_VALIDATION].includes(action)) {
    const callbackURLTo = await getEndpointFn(to, REQUEST_TYPE.PUT_ERROR)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT_ERROR)

    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
    // forward the abort to the destination
    jwsSigner = getJWSSigner(Enum.Http.Headers.FSPIOP.SWITCH.value)
    logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, Enum.Http.Headers.FSPIOP.SWITCH.value, to, PUT, payloadForCallback, Enum.Http.ResponseTypes.JSON, span, jwsSigner, protocolVersions)

    // send an extra notification back to the original sender (if enabled in config) and ignore this for on-us transfers
    if (Config.SEND_TRANSFER_CONFIRMATION_TO_PAYEE && from !== to && from !== Enum.Http.Headers.FSPIOP.SWITCH.value) {
      const callbackURLFrom = await getEndpointFn(from, REQUEST_TYPE.PUT_ERROR)
      logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLFrom}, ${PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${Enum.Http.Headers.FSPIOP.SWITCH.value}, ${from})`)
      callbackHeaders = createCallbackHeaders({ dfspId: from, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
      await Callback.sendRequest(callbackURLFrom, callbackHeaders, Enum.Http.Headers.FSPIOP.SWITCH.value, from, PUT, payloadForCallback, Enum.Http.ResponseTypes.JSON, span, jwsSigner, protocolVersions)
      histTimerEnd({ success: true, action })
      return true
    } else {
      logger.debug(`Notification::processMessage - Action: ${action} - Skipping notification callback to original sender (${from}).`)
    }
    histTimerEnd({ success: true, action })
    return true
  }

  // special event emitted by central-ledger when the Payee sent a status of `RESERVED` in PUT /transfers/{ID}
  // and the ledger failed to commit the transfer
  if ([Action.RESERVED_ABORTED, Action.FX_RESERVED_ABORTED].includes(action)) {
    if (parseFloat(Config.PROTOCOL_VERSIONS.CONTENT.DEFAULT) < 1.1) {
      logger.debug(`Notification::processMessage - Action: ${action} - Skipping reserved_aborted notification callback (${from}).`)
      return
    }
    // TODO: this should possibly be address by a new endpoint-type FSPIOP_CALLBACK_URL_TRANSFER_PATCH, but for the time being lets avoid adding a new enum as we want to simplify the configurations and consolidate them instead in future.
    const callbackURLTo = await getEndpointFn(to, REQUEST_TYPE.PUT)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT)
    const method = PATCH
    callbackHeaders = createCallbackHeaders({
      dfspId: to,
      transferId: id,
      headers: content.headers,
      httpMethod: method,
      endpointTemplate
    }, fromSwitch)
    logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${method}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${Enum.Http.Headers.FSPIOP.SWITCH.value}, ${from})`)

    const histTimerEndSendRequest = Metrics.getHistogram(
      'notification_event_delivery',
      'notification_event_delivery - metric for sending notification requests to FSPs',
      ['success', 'from', 'dest', 'action', 'status']
    ).startTimer()

    let callbackResponse
    try {
      jwsSigner = getJWSSigner(Enum.Http.Headers.FSPIOP.SWITCH.value)
      callbackResponse = await Callback.sendRequest(
        callbackURLTo,
        callbackHeaders,
        Enum.Http.Headers.FSPIOP.SWITCH.value,
        to,
        method,
        payloadForCallback,
        Enum.Http.ResponseTypes.JSON,
        span,
        jwsSigner,
        protocolVersions
      )
    } catch (err) {
      histTimerEndSendRequest({ success: false, dest: from, action, status: callbackResponse && callbackResponse.status })
      histTimerEnd({ success: false, action })
      throw err
    }
    histTimerEndSendRequest({ success: true, dest: from, action, status: callbackResponse && callbackResponse.status })
    histTimerEnd({ success: true, action })
    return callbackResponse
  }

  if ([Action.FULFIL_DUPLICATE, Action.FX_FULFIL_DUPLICATE].includes(action)) {
    const callbackURLTo = isSuccess ? await getEndpointFn(to, REQUEST_TYPE.PUT) : await getEndpointFn(to, REQUEST_TYPE.PUT_ERROR)
    const endpointTemplate = isSuccess ? getEndpointTemplate(REQUEST_TYPE.PUT) : getEndpointTemplate(REQUEST_TYPE.PUT_ERROR)
    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)

    logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, PUT, payloadForCallback, Enum.Http.ResponseTypes.JSON, span, jwsSigner, protocolVersions)
    histTimerEnd({ success: true, action })
    return true
  }

  if ([Action.ABORT_DUPLICATE, Action.FX_ABORT_DUPLICATE].includes(action) && isSuccess) {
    const callbackURLTo = await getEndpointFn(to, REQUEST_TYPE.PUT)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT)

    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate })
    logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, PUT, payloadForCallback, Enum.Http.ResponseTypes.JSON, span, null, protocolVersions)
    histTimerEnd({ success: true, action })
    return true
  }

  if ([Action.ABORT_DUPLICATE, Action.FX_ABORT_DUPLICATE].includes(action) && !isSuccess) {
    const callbackURLTo = await getEndpointFn(to, REQUEST_TYPE.PUT_ERROR)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT_ERROR)

    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
    logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, PUT, payloadForCallback, Enum.Http.ResponseTypes.JSON, span, jwsSigner, protocolVersions)
    histTimerEnd({ success: true, action })
    return true
  }

  if ([Action.TIMEOUT_RECEIVED, Action.FX_TIMEOUT_RECEIVED].includes(action)) {
    const callbackURLTo = await getEndpointFn(to, REQUEST_TYPE.PUT_ERROR)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT_ERROR)

    jwsSigner = getJWSSigner(Enum.Http.Headers.FSPIOP.SWITCH.value)
    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
    logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${Enum.Http.Headers.FSPIOP.SWITCH.value}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, Enum.Http.Headers.FSPIOP.SWITCH.value, to, PUT, payloadForCallback, Enum.Http.ResponseTypes.JSON, span, jwsSigner, protocolVersions)
    histTimerEnd({ success: true, action })
    return true
  }

  if ([Action.TIMEOUT_RESERVED, Action.FX_TIMEOUT_RESERVED].includes(action)) {
    const callbackURLTo = await getEndpointFn(to, REQUEST_TYPE.PUT_ERROR)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT_ERROR)

    jwsSigner = getJWSSigner(Enum.Http.Headers.FSPIOP.SWITCH.value)
    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
    logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${Enum.Http.Headers.FSPIOP.SWITCH.value}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, Enum.Http.Headers.FSPIOP.SWITCH.value, to, PUT, payloadForCallback, Enum.Http.ResponseTypes.JSON, span, jwsSigner, protocolVersions)

    const callbackURLFrom = await getEndpointFn(from, REQUEST_TYPE.PUT_ERROR)
    logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLFrom}, ${PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${Enum.Http.Headers.FSPIOP.SWITCH.value}, ${from})`)
    callbackHeaders = createCallbackHeaders({ dfspId: from, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
    await Callback.sendRequest(callbackURLFrom, callbackHeaders, Enum.Http.Headers.FSPIOP.SWITCH.value, from, PUT, payloadForCallback, Enum.Http.ResponseTypes.JSON, span, jwsSigner, protocolVersions)

    histTimerEnd({ success: true, action })
    return true
  }

  if ([Action.GET, Action.FX_GET].includes(action)) {
    const callbackURLTo = isSuccess ? await getEndpointFn(to, REQUEST_TYPE.PUT) : await getEndpointFn(to, REQUEST_TYPE.PUT_ERROR)
    const endpointTemplate = isSuccess ? getEndpointTemplate(REQUEST_TYPE.PUT) : getEndpointTemplate(REQUEST_TYPE.PUT_ERROR)

    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)

    logger.debug(`Notification::processMessage - Callback.sendRequest (${action})...`, { callbackURLTo, callbackHeaders, payloadForCallback, id, from, to })
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, PUT, payloadForCallback, Enum.Http.ResponseTypes.JSON, span, jwsSigner, protocolVersions)
    histTimerEnd({ success: true, action })
    return true
  }

  Logger.warn(`Unknown action received from kafka: ${action}`)
  histTimerEnd({ success: false, action: 'unknown' })
  return false
}

/**
  * @function isConnected
  *
  *
  * @description Use this to determine whether or not we are connected to the broker.
  *
  * @returns {boolean}
  */
const isConnected = () => {
  return notificationConsumer.isConnected()
}

/**
  * @function disconnect
  *
  *
  * @description Disconnect from the notificationConsumer
  *
  * @returns Promise<*> - Passes on the Promise from Consumer.disconnect()
  * @throws {Error} - if the consumer hasn't been initialized, or disconnect() throws an error
  */
const disconnect = async () => {
  if (!notificationConsumer || !notificationConsumer.disconnect) {
    throw new Error('Tried to disconnect from notificationConsumer, but notificationConsumer is not initialized')
  }

  return notificationConsumer.disconnect()
}

/**
  * @function getJWSSigner
  *
  *
  * @description Get the JWS signer if enabled
  *
  * @returns {Object} - returns JWS signer if enabled else returns undefined
  */
const getJWSSigner = (from) => {
  let jwsSigner
  if (Config.JWS_SIGN && from === Config.FSPIOP_SOURCE_TO_SIGN) {
    logger.debug('Notification::getJWSSigner: get JWS signer')
    jwsSigner = new JwsSigner({
      logger: Logger,
      signingKey: Config.JWS_SIGNING_KEY
    })
  }
  return jwsSigner
}

module.exports = {
  disconnect,
  startConsumer,
  processMessage,
  consumeMessage,
  isConnected
}
