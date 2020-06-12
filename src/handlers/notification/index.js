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

const Consumer = require('@mojaloop/central-services-stream').Kafka.Consumer
const Logger = require('@mojaloop/central-services-logger')
const EventSdk = require('@mojaloop/event-sdk')
const Participant = require('../../domain/participant')
const Callback = require('@mojaloop/central-services-shared').Util.Request
const createCallbackHeaders = require('../../lib/headers').createCallbackHeaders
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const KafkaUtil = require('@mojaloop/central-services-shared').Util.Kafka
const JwsSigner = require('@mojaloop/sdk-standard-components').Jws.signer

const Metrics = require('@mojaloop/central-services-metrics')
const ENUM = require('@mojaloop/central-services-shared').Enum
const decodePayload = require('@mojaloop/central-services-shared').Util.StreamingProtocol.decodePayload
const isDataUri = require('@mojaloop/central-services-shared').Util.StreamingProtocol.isDataUri
const Config = require('../../lib/config')

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
  Logger.isInfoEnabled && Logger.info('Notification::startConsumer')
  let topicName
  try {
    const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, ENUM.Events.Event.Type.NOTIFICATION, ENUM.Events.Event.Action.EVENT)
    topicName = topicConfig.topicName
    Logger.isInfoEnabled && Logger.info(`Notification::startConsumer - starting Consumer for topicNames: [${topicName}]`)
    const config = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, ENUM.Kafka.Config.CONSUMER, ENUM.Events.Event.Type.NOTIFICATION.toUpperCase(), ENUM.Events.Event.Action.EVENT.toUpperCase())
    config.rdkafkaConf['client.id'] = topicName

    if (config.rdkafkaConf['enable.auto.commit'] !== undefined) {
      autoCommitEnabled = config.rdkafkaConf['enable.auto.commit']
    }
    notificationConsumer = new Consumer([topicName], config)
    await notificationConsumer.connect()
    Logger.isInfoEnabled && Logger.info(`Notification::startConsumer - Kafka Consumer connected for topicNames: [${topicName}]`)
    await notificationConsumer.consume(consumeMessage)
    Logger.isInfoEnabled && Logger.info(`Notification::startConsumer - Kafka Consumer created for topicNames: [${topicName}]`)
    return true
  } catch (err) {
    Logger.error(`Notification::startConsumer - error for topicNames: [${topicName}] - ${err}`)
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    Logger.error(fspiopError)
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
  Logger.isInfoEnabled && Logger.info('Notification::consumeMessage')
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
      Logger.error(fspiopError)
      throw fspiopError
    }
    Logger.isInfoEnabled && Logger.info(`Notification:consumeMessage message: - ${JSON.stringify(message)}`)

    message = (!Array.isArray(message) ? [message] : message)
    let combinedResult = true
    for (const msg of message) {
      Logger.isInfoEnabled && Logger.info('Notification::consumeMessage::processMessage')
      const contextFromMessage = EventSdk.Tracer.extractContextFromMessage(msg.value)
      const span = EventSdk.Tracer.createChildSpanFromContext('ml_notification_event', contextFromMessage)
      const traceTags = span.getTracestateTags()
      if (traceTags.timeApiPrepare && parseInt(traceTags.timeApiPrepare)) timeApiPrepare = parseInt(traceTags.timeApiPrepare)
      if (traceTags.timeApiFulfil && parseInt(traceTags.timeApiFulfil)) timeApiFulfil = parseInt(traceTags.timeApiFulfil)
      try {
        await span.audit(msg, EventSdk.AuditEventAction.start)
        const res = await processMessage(msg, span).catch(err => {
          const fspiopError = ErrorHandler.Factory.createInternalServerFSPIOPError('Error processing notification message', err)
          Logger.error(fspiopError)
          if (!autoCommitEnabled) {
            notificationConsumer.commitMessageSync(msg)
          }
          throw fspiopError // We return 'resolved' since we have dealt with the error here
        })
        if (!autoCommitEnabled) {
          notificationConsumer.commitMessageSync(msg)
        }
        Logger.isDebugEnabled && Logger.debug(`Notification:consumeMessage message processed: - ${res}`)
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
    Logger.error(fspiopError)
    recordTxMetrics(timeApiPrepare, timeApiFulfil, false)

    const getRecursiveCause = (error) => {
      if (error.cause instanceof ErrorHandler.Factory.FSPIOPError) {
        return getRecursiveCause(error.cause)
      } else if (error.cause instanceof Error) {
        if (error.cause) {
          return error.cause
        } else {
          return error.message
        }
      } else if (error.cause) {
        return error.cause
      } else if (error.message) {
        return error.message
      } else {
        return error
      }
    }
    const errCause = getRecursiveCause(err)
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
 * @returns {boolean} Returns true on sucess and throws error on failure
 */

const processMessage = async (msg, span) => {
  const histTimerEnd = Metrics.getHistogram(
    'notification_event_process_msg',
    'Consume a notification message from the kafka topic and process it accordingly',
    ['success', 'action']
  ).startTimer()
  Logger.isInfoEnabled && Logger.info('Notification::processMessage')
  if (!msg.value || !msg.value.content || !msg.value.content.headers || !msg.value.content.payload) {
    histTimerEnd({ success: false, action: 'unknown' })
    throw ErrorHandler.Factory.createInternalServerFSPIOPError('Invalid message received from kafka')
  }

  const { metadata, from, to, content } = msg.value
  const { action, state } = metadata.event
  const status = state.status
  const fromSwitch = true

  const actionLower = action.toLowerCase()
  const statusLower = status.toLowerCase()

  Logger.isInfoEnabled && Logger.info('Notification::processMessage action: ' + action)
  Logger.isInfoEnabled && Logger.info('Notification::processMessage status: ' + status)
  const decodedPayload = decodePayload(content.payload, { asParsed: false })
  const id = JSON.parse(decodedPayload.body.toString()).transferId || (content.uriParams && content.uriParams.id)
  let payloadForCallback
  let callbackHeaders

  if (isDataUri(content.payload)) {
    payloadForCallback = decodedPayload.body.toString()
  } else {
    const parsedPayload = JSON.parse(decodedPayload.body)
    if (parsedPayload.errorInformation) {
      payloadForCallback = JSON.stringify(ErrorHandler.CreateFSPIOPErrorFromErrorInformation(parsedPayload.errorInformation).toApiErrorObject(Config.ERROR_HANDLING))
    } else {
      payloadForCallback = decodedPayload.body.toString()
    }
  }

  let jwsSigner = getJWSSigner(from)

  if (actionLower === ENUM.Events.Event.Action.PREPARE && statusLower === ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_POST, id, span)
    callbackHeaders = createCallbackHeaders({ headers: content.headers, httpMethod: ENUM.Http.RestMethods.POST, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_POST })
    Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.POST}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    let response = { status: 'unknown' }
    const histTimerEndSendRequest = Metrics.getHistogram(
      'notification_event_delivery',
      'notification_event_delivery - metric for sending notification requests to FSPs',
      ['success', 'from', 'to', 'dest', 'action', 'status']
    ).startTimer()
    //
    try {
      response = await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, ENUM.Http.RestMethods.POST, payloadForCallback, ENUM.Http.ResponseTypes.JSON, span)
    } catch (err) {
      Logger.error(err)
      histTimerEndSendRequest({ success: false, from, dest: to, action, status: response.status })
      histTimerEnd({ success: false, action })
      throw err
    }
    histTimerEndSendRequest({ success: true, from, dest: to, action, status: response.status })
    histTimerEnd({ success: false, action })
    return true
  }

  if (actionLower === ENUM.Events.Event.Action.PREPARE && statusLower !== ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id, span)
    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, fromSwitch)
    Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback, ENUM.Http.ResponseTypes.JSON, span, jwsSigner)
    histTimerEnd({ success: true, action })
    return true
  }

  if (actionLower === ENUM.Events.Event.Action.PREPARE_DUPLICATE && statusLower === ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id, span)
    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, fromSwitch)
    Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback, ENUM.Http.ResponseTypes.JSON, span, jwsSigner)
    return true
  }

  if (actionLower === ENUM.Events.Event.Action.COMMIT && statusLower === ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id, span)
    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
    // forward the fulfil to the destination
    Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    let response = { status: 'unknown' }
    const histTimerEndSendRequest = Metrics.getHistogram(
      'notification_event_delivery',
      'notification_event_delivery - metric for sending notification requests to FSPs',
      ['success', 'from', 'dest', 'action', 'status']
    ).startTimer()
    try {
      response = await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback, ENUM.Http.ResponseTypes.JSON, span)
    } catch (err) {
      histTimerEndSendRequest({ success: false, from, dest: to, action, status: response.status })
      histTimerEnd({ success: false, action })
      throw err
    }
    histTimerEndSendRequest({ success: true, from, dest: to, action, status: response.status })

    // send an extra notification back to the original sender (if enabled in config) and ignore this for on-us transfers
    if (Config.SEND_TRANSFER_CONFIRMATION_TO_PAYEE && from !== to) {
      const callbackURLFrom = await Participant.getEndpoint(from, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id, span)
      Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLFrom}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${ENUM.Http.Headers.FSPIOP.SWITCH.value}, ${from})`)
      callbackHeaders = createCallbackHeaders({ dfspId: from, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, fromSwitch)
      const histTimerEndSendRequest2 = Metrics.getHistogram(
        'notification_event_delivery',
        'notification_event_delivery - metric for sending notification requests to FSPs',
        ['success', 'from', 'dest', 'action', 'status']
      ).startTimer()
      let rv
      try {
        jwsSigner = getJWSSigner(ENUM.Http.Headers.FSPIOP.SWITCH.value)
        rv = await Callback.sendRequest(callbackURLFrom, callbackHeaders, ENUM.Http.Headers.FSPIOP.SWITCH.value, from, ENUM.Http.RestMethods.PUT, payloadForCallback, ENUM.Http.ResponseTypes.JSON, span, jwsSigner)
      } catch (err) {
        histTimerEndSendRequest2({ success: false, dest: from, action, status: response.status })
        histTimerEnd({ success: false, action })
        throw err
      }
      histTimerEndSendRequest2({ success: true, dest: from, action, status: response.status })

      histTimerEnd({ success: true, action })
      return rv
    } else {
      Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Action: ${actionLower} - Skipping notification callback to original sender (${from}) because feature is disabled in config.`)
      histTimerEnd({ success: true, action })
      return true
    }
  }

  if (actionLower === ENUM.Events.Event.Action.COMMIT && statusLower !== ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id, span)
    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, fromSwitch)
    Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback, ENUM.Http.ResponseTypes.JSON, span, jwsSigner)
    histTimerEnd({ success: true, action })
    return true
  }

  if (actionLower === ENUM.Events.Event.Action.REJECT) {
    const callbackURLFrom = await Participant.getEndpoint(from, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id, span)
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id, span)
    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
    // forward the reject to the destination
    Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback, ENUM.Http.ResponseTypes.JSON, span)

    // send an extra notification back to the original sender (if enabled in config) and ignore this for on-us transfers
    if (Config.SEND_TRANSFER_CONFIRMATION_TO_PAYEE && from !== to) {
      jwsSigner = getJWSSigner(ENUM.Http.Headers.FSPIOP.SWITCH.value)
      Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLFrom}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${ENUM.Http.Headers.FSPIOP.SWITCH.value}, ${from})`)
      callbackHeaders = createCallbackHeaders({ dfspId: from, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, fromSwitch)
      const response = await Callback.sendRequest(callbackURLFrom, callbackHeaders, ENUM.Http.Headers.FSPIOP.SWITCH.value, from, ENUM.Http.RestMethods.PUT, payloadForCallback, ENUM.Http.ResponseTypes.JSON, span, jwsSigner)
      histTimerEnd({ success: true, action })
      return response
    } else {
      Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Action: ${actionLower} - Skipping notification callback to original sender (${from}) because feature is disabled in config.`)
    }
    histTimerEnd({ success: true, action })
    return true
  }

  if (actionLower === ENUM.Events.Event.Action.ABORT) {
    const callbackURLFrom = await Participant.getEndpoint(from, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id, span)
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id, span)
    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR })
    // forward the abort to the destination
    Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback, ENUM.Http.ResponseTypes.JSON, span)

    // send an extra notification back to the original sender (if enabled in config) and ignore this for on-us transfers
    if (Config.SEND_TRANSFER_CONFIRMATION_TO_PAYEE && from !== to) {
      jwsSigner = getJWSSigner(ENUM.Http.Headers.FSPIOP.SWITCH.value)
      Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLFrom}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${ENUM.Http.Headers.FSPIOP.SWITCH.value}, ${from})`)
      callbackHeaders = createCallbackHeaders({ dfspId: from, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, fromSwitch)
      const response = await Callback.sendRequest(callbackURLFrom, callbackHeaders, ENUM.Http.Headers.FSPIOP.SWITCH.value, from, ENUM.Http.RestMethods.PUT, payloadForCallback, ENUM.Http.ResponseTypes.JSON, span, jwsSigner)
      histTimerEnd({ success: true, action })
      return response
    } else {
      Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Action: ${actionLower} - Skipping notification callback to original sender (${from}) because feature is disabled in config.`)
    }
    histTimerEnd({ success: true, action })
    return true
  }

  if (actionLower === ENUM.Events.Event.Action.FULFIL_DUPLICATE && statusLower === ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id, span)
    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, fromSwitch)
    Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback, ENUM.Http.ResponseTypes.JSON, span, jwsSigner)
    histTimerEnd({ success: true, action })
    return true
  }

  if (actionLower === ENUM.Events.Event.Action.FULFIL_DUPLICATE && statusLower !== ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id, span)
    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, fromSwitch)
    Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback, ENUM.Http.ResponseTypes.JSON, span, jwsSigner)
    histTimerEnd({ success: true, action })
    return true
  }

  if (actionLower === ENUM.Events.Event.Action.ABORT_DUPLICATE && statusLower === ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id, span)
    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT })
    Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback, ENUM.Http.ResponseTypes.JSON, span)
    histTimerEnd({ success: true, action })
    return true
  }

  if (actionLower === ENUM.Events.Event.Action.ABORT_DUPLICATE && statusLower !== ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id, span)
    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, fromSwitch)
    Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback, ENUM.Http.ResponseTypes.JSON, span, jwsSigner)
    histTimerEnd({ success: true, action })
    return true
  }

  if (actionLower === ENUM.Events.Event.Action.TIMEOUT_RECEIVED) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id, span)
    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR })
    Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${to}, ${from})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback, ENUM.Http.ResponseTypes.JSON, span)
    histTimerEnd({ success: true, action })
    return true
  }

  if (actionLower === ENUM.Events.Event.Action.TIMEOUT_RESERVED) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id, span)
    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR })
    Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${to}, ${from})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback, ENUM.Http.ResponseTypes.JSON, span)

    const callbackURLFrom = await Participant.getEndpoint(from, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id, span)
    jwsSigner = getJWSSigner(ENUM.Http.Headers.FSPIOP.SWITCH.value)
    Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLFrom}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${ENUM.Http.Headers.FSPIOP.SWITCH.value}, ${from})`)
    callbackHeaders = createCallbackHeaders({ dfspId: from, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, fromSwitch)
    await Callback.sendRequest(callbackURLFrom, callbackHeaders, ENUM.Http.Headers.FSPIOP.SWITCH.value, from, ENUM.Http.RestMethods.PUT, payloadForCallback, ENUM.Http.ResponseTypes.JSON, span, jwsSigner)

    histTimerEnd({ success: true, action })
    return true
  }

  if (actionLower === ENUM.Events.Event.Action.GET && statusLower === ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT, id, span)
    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT }, fromSwitch)
    Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback, ENUM.Http.ResponseTypes.JSON, span, jwsSigner)
    histTimerEnd({ success: true, action })
    return true
  }

  if (actionLower === ENUM.Events.Event.Action.GET && statusLower !== ENUM.Events.EventStatus.SUCCESS.status) {
    const callbackURLTo = await Participant.getEndpoint(to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_ERROR, id, span)
    callbackHeaders = createCallbackHeaders({ dfspId: to, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.TRANSFERS_PUT_ERROR }, fromSwitch)
    Logger.isDebugEnabled && Logger.debug(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(callbackHeaders)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
    await Callback.sendRequest(callbackURLTo, callbackHeaders, from, to, ENUM.Http.RestMethods.PUT, payloadForCallback, ENUM.Http.ResponseTypes.JSON, span, jwsSigner)
    histTimerEnd({ success: true, action })
    return true
  }

  Logger.warn(`Unknown action received from kafka: ${action}`)
  histTimerEnd({ success: false, action: 'unknown' })
  return false
}

/**
 * @function getMetadataPromise
 *
 * @description a Promisified version of getMetadata on the kafka consumer
 *
 * @param {Kafka.Consumer} consumer The consumer
 * @param {string} topic The topic name
 * @returns {Promise<object>} Metadata response
 */
const getMetadataPromise = (consumer, topic) => {
  return new Promise((resolve, reject) => {
    const cb = (err, metadata) => {
      if (err) {
        return reject(new Error(`Error connecting to consumer: ${err}`))
      }

      return resolve(metadata)
    }

    consumer.getMetadata({ topic, timeout: 3000 }, cb)
  })
}

/**
 * @function isConnected
 *
 *
 * @description Use this to determine whether or not we are connected to the broker. Internally, it calls `getMetadata` to determine
 * if the broker client is connected.
 *
 * @returns {true} - if connected
 * @throws {Error} - if we can't find the topic name, or the consumer is not connected
 */
const isConnected = async () => {
  const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, ENUM.Events.Event.Type.NOTIFICATION, ENUM.Events.Event.Action.EVENT)
  const topicName = topicConfig.topicName
  const metadata = await getMetadataPromise(notificationConsumer, topicName)

  const foundTopics = metadata.topics.map(topic => topic.name)
  if (foundTopics.indexOf(topicName) === -1) {
    Logger.isDebugEnabled && Logger.debug(`Connected to consumer, but ${topicName} not found.`)
    throw new Error(`Connected to consumer, but ${topicName} not found.`)
  }

  return true
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
    const logger = Logger
    logger.log = logger.info
    Logger.isInfoEnabled && Logger.info('Notification::getJWSSigner: get JWS signer')
    jwsSigner = new JwsSigner({
      logger,
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
