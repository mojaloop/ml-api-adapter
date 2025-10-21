/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

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
const { Kafka: { Consumer, otel }, Util: { Producer } } = require('@mojaloop/central-services-stream')
const { Util, Enum, Util: { Hapi }, Enum: { Tags: { QueryTags } } } = require('@mojaloop/central-services-shared')
const { makeAcceptContentTypeHeader } = require('@mojaloop/central-services-shared').Util.Headers

const { logger } = require('../../shared/logger')
const { createCallbackHeaders } = require('../../lib/headers')
const Participant = require('../../domain/participant')
const Config = require('../../lib/config')
const dto = require('./dto')
const dtoTransfer = require('../../domain/transfer/dto')
const utils = require('./utils')
const { injectAuditQueryTags } = require('../../lib/util')
const { PAYLOAD_STORAGES } = require('../../lib/payloadCache/constants')
const { TransformFacades } = require('@mojaloop/ml-schema-transformer-lib')

const Callback = Util.Request
const HeaderValidation = Util.HeaderValidation
const { Action } = Enum.Events.Event
const { PATCH, POST, PUT } = Enum.Http.RestMethods
const { FspEndpointTypes, FspEndpointTemplates } = Enum.EndPoints

let consumerConfig = null
let notificationConsumer = {}
let autoCommitEnabled = true
let PayloadCache

const hubNameRegex = HeaderValidation.getHubNameRegex(Config.HUB_NAME)
const API_TYPE = Config.API_TYPE

const recordTxMetrics = (timeApiPrepare, timeApiFulfil, success) => {
  const endTime = Date.now()
  if (timeApiPrepare && !timeApiFulfil) {
    const histTracePrepareTimerEnd = Metrics.getHistogram(
      'tx_transfer_prepare',
      'Transaction metrics for Transfers - Prepare Flow',
      ['success']
    )
    histTracePrepareTimerEnd.observe({ success }, (endTime - timeApiPrepare) / 1000)
  }
  if (timeApiFulfil) {
    const histTraceFulfilTimerEnd = Metrics.getHistogram(
      'tx_transfer_fulfil',
      'Transaction metrics for Transfers - Fulfil Flow',
      ['success']
    )
    histTraceFulfilTimerEnd.observe({ success }, (endTime - timeApiFulfil) / 1000)
  }
  if (timeApiPrepare && timeApiFulfil) {
    const histTraceEnd2EndTimerEnd = Metrics.getHistogram(
      'tx_transfer',
      'Transaction metrics for Transfers - End-to-end Flow',
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
const startConsumer = async ({ payloadCache } = {}) => {
  if (Config.ORIGINAL_PAYLOAD_STORAGE === PAYLOAD_STORAGES.redis && !payloadCache) {
    throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.INTERNAL_SERVER_ERROR, 'Payload cache not initialized')
  }
  PayloadCache = payloadCache
  const functionality = Enum.Events.Event.Type.NOTIFICATION
  const action = Action.EVENT
  let topicName

  try {
    const topicConfig = Util.Kafka.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, functionality, action)
    topicName = topicConfig.topicName
    logger.info(`Notification::startConsumer - starting Consumer for topicNames: [${topicName}]`)

    consumerConfig = Util.Kafka.getKafkaConfig(Config.KAFKA_CONFIG, Enum.Kafka.Config.CONSUMER, functionality.toUpperCase(), action.toUpperCase())
    consumerConfig.options.disableOtelSpanAutoCreation = true // Disable auto creation of OTel span inside central-services-stream lib
    consumerConfig.rdkafkaConf['client.id'] = topicName

    if (consumerConfig.rdkafkaConf['enable.auto.commit'] !== undefined) {
      autoCommitEnabled = consumerConfig.rdkafkaConf['enable.auto.commit']
    }
    notificationConsumer = new Consumer([topicName], consumerConfig)

    await PayloadCache?.connect()
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
      const errMessage = 'error while reading message from kafka: '
      logger.error(errMessage, error)
      throw ErrorHandler.Factory.createInternalServerFSPIOPError(`${errMessage} ${error?.message}`, error)
    }
    logger.debug('Notification:consumeMessage message:', message)

    const isBatch = Array.isArray(message)
    message = Array.isArray(message) ? message : [message]
    let combinedResult = true

    const processOneMessage = async (msg) => {
      logger.debug('Notification::consumeMessage - processOneMessage...')
      const contextFromMessage = EventSdk.Tracer.extractContextFromMessage(msg.value)
      const span = EventSdk.Tracer.createChildSpanFromContext('ml_notification_event', contextFromMessage)
      const traceTags = span.getTracestateTags()
      if (traceTags.timeApiPrepare && parseInt(traceTags.timeApiPrepare)) timeApiPrepare = parseInt(traceTags.timeApiPrepare)
      if (traceTags.timeApiFulfil && parseInt(traceTags.timeApiFulfil)) timeApiFulfil = parseInt(traceTags.timeApiFulfil)

      try {
        const result = await processMessage(msg, span).catch(err => {
          logger.error('error in notification processMessage: ', err)
          const fspiopError = ErrorHandler.Factory.createInternalServerFSPIOPError(
            `Notification message processing error: ${err?.message}`, err
          )

          if (!autoCommitEnabled) {
            notificationConsumer.commitMessageSync(msg)
          }
          if (!isBatch) throw fspiopError // do not throw in batch mode, so that other messages can be processed
          return false
        })
        if (!autoCommitEnabled) {
          notificationConsumer.commitMessageSync(msg)
        }
        logger.verbose('Notification:consumeMessage - message processed:', { result })
        combinedResult = (combinedResult && result)
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

    for (const msg of message) {
      const { executeInsideSpanContext } = otel.startConsumerTracingSpan(msg, consumerConfig)
      await executeInsideSpanContext(() => processOneMessage(msg))
    }

    recordTxMetrics(timeApiPrepare, timeApiFulfil, true)
    histTimerEnd({ success: true })
    return combinedResult
  } catch (err) {
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    logger.warn('error in notification consumeMessage: ', fspiopError)
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
    throw ErrorHandler.Factory.createInternalServerFSPIOPError('Invalid message received from kafka', { msg })
  }

  // We should not validate original Request for certain actions
  if (
    msg.value.metadata?.event?.action &&
    ![
      Action.PREPARE_DUPLICATE, Action.FX_PREPARE_DUPLICATE,
      Action.ABORT_VALIDATION, Action.FX_ABORT_VALIDATION,
      Action.RESERVED_ABORTED, Action.FX_RESERVED_ABORTED,
      Action.FULFIL_DUPLICATE, Action.FX_FULFIL_DUPLICATE,
      Action.GET, Action.FX_GET,
      Action.FX_NOTIFY,
      Action.TIMEOUT_RECEIVED, Action.FX_TIMEOUT_RECEIVED,
      Action.TIMEOUT_RESERVED, Action.FX_TIMEOUT_RESERVED
    ].includes(msg.value.metadata.event.action) &&
    !msg.value.content.context &&
    (!msg.value.content.context?.originalRequestId && !msg.value.content.context?.originalRequestPayload)
  ) {
    histTimerEnd({ success: false, action: 'unknown' })
    throw ErrorHandler.Factory.createInternalServerFSPIOPError(`Invalid message received from kafka - wrong action "${msg.value.metadata?.event?.action}" or no context`, { offset: msg.offset, partition: msg.partition, topic: msg.topic })
  }

  const fromSwitch = true
  const responseType = Enum.Http.ResponseTypes.JSON
  const notificationDto = await dto.notificationMessageDto(msg, PayloadCache)
  const {
    id,
    from: source,
    to: destination,
    action,
    content,
    isFx,
    isSuccess,
    isOriginalId
  } = notificationDto
  let {
    payloadForCallback: payload,
    fspiopObject
  } = notificationDto

  const REQUEST_TYPE = {
    POST: 'POST',
    PUT: 'PUT',
    PUT_ERROR: 'PUT_ERROR',
    PATCH: 'PATCH'
  }

  const getEndpointFn = async (fsp, requestType, proxy) => {
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

    return Participant.getEndpoint({ fsp, endpointType, id, isFx, span, proxy })
  }

  const getEndpointTemplate = (requestType, _isFx = isFx) => {
    switch (requestType) {
      case REQUEST_TYPE.POST:
        return _isFx
          ? FspEndpointTemplates.FX_TRANSFERS_POST
          : FspEndpointTemplates.TRANSFERS_POST
      case REQUEST_TYPE.PUT:
      case REQUEST_TYPE.PATCH:
        return _isFx
          ? FspEndpointTemplates.FX_TRANSFERS_PUT
          : FspEndpointTemplates.TRANSFERS_PUT
      case REQUEST_TYPE.PUT_ERROR:
        return _isFx
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

  let jwsSigner = getJWSSigner(source)
  let headers // callback headers
  const serviceName = QueryTags.serviceName.mlNotificationHandler

  const sendHttpRequest = ({ method, ...restArgs }) => Callback.sendRequest({
    method: method.toUpperCase(),
    apiType: API_TYPE,
    hubNameRegex,
    protocolVersions,
    span,
    responseType,
    axiosRequestOptionsOverride: {
      timeout: Config.HTTP_REQUEST_TIMEOUT_MS
    },
    ...restArgs
  })

  if ([Action.PREPARE, Action.FX_PREPARE].includes(action)) {
    if (!isSuccess) {
      const callbackURLTo = await getEndpointFn(destination, REQUEST_TYPE.PUT_ERROR)
      const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT_ERROR)
      headers = createCallbackHeaders({ dfspId: destination, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
      logger.debug(`Notification::processMessage - Callback.sendRequest({${callbackURLTo}, ${PUT}, ${JSON.stringify(headers)}, ${payload}, ${id}, ${source}, ${destination}) ${hubNameRegex}}`)
      injectAuditQueryTags({ span, action, id, url: callbackURLTo, method: PUT, isFx, serviceName, ...(isFx ? { additionalTags: { determiningTransferId: fspiopObject.determiningTransferId } } : {}) })
      await sendHttpRequest({
        url: callbackURLTo,
        headers,
        source,
        destination,
        method: PUT,
        payload,
        span,
        jwsSigner
      })
      histTimerEnd({ success: true, action })
      return true
    }

    const { url: callbackURLTo, proxyId } = await getEndpointFn(destination, REQUEST_TYPE.POST, true)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.POST)
    headers = createCallbackHeaders({ headers: content.headers, httpMethod: POST, endpointTemplate })
    logger.debug(`Notification::processMessage - Callback.sendRequest({ ${callbackURLTo}, ${POST}, ${JSON.stringify(content.headers)}, ${payload}, ${id}, ${source}, ${destination} ${hubNameRegex} })`)
    let response = { status: 'unknown' }
    const histTimerEndSendRequest = Metrics.getHistogram(
      'notification_event_delivery',
      'notification_event_delivery - metric for sending notification requests to FSPs',
      ['success', 'from', 'to', 'dest', 'action', 'status']
    ).startTimer()
    try {
      injectAuditQueryTags({ span, action, id, url: callbackURLTo, method: POST, isFx, serviceName, ...(isFx ? { additionalTags: { determiningTransferId: fspiopObject.determiningTransferId } } : {}) })
      response = await sendHttpRequest({ apiType: API_TYPE, url: callbackURLTo, headers, source, destination, method: POST, payload, responseType, span, protocolVersions, hubNameRegex })
    } catch (err) {
      logger.error(err)
      histTimerEndSendRequest({ success: false, from: source, dest: destination, action, status: response.status })
      histTimerEnd({ success: false, action })
      throw err
    }
    histTimerEndSendRequest({ success: true, from: source, dest: destination, action, status: response.status })
    histTimerEnd({ success: true, action })

    // disable timeout
    if (proxyId) {
      if (isFx) {
        const { topicConfig, kafkaConfig } = dtoTransfer.producerConfigDto(Action.TRANSFER, Action.PREPARE, 'fx-forward')
        await Producer.produceMessage(dtoTransfer.fxForwardedMessageDto(id, source, destination, { proxyId, commitRequestId: id }), topicConfig, kafkaConfig)
      } else {
        const { topicConfig, kafkaConfig } = dtoTransfer.producerConfigDto(Action.TRANSFER, Action.PREPARE, 'forward')
        await Producer.produceMessage(dtoTransfer.forwardedMessageDto(id, source, destination, { proxyId, transferId: id }), topicConfig, kafkaConfig)
      }
    }

    return true
  }

  if ([Action.PREPARE_DUPLICATE, Action.FX_PREPARE_DUPLICATE].includes(action) && isSuccess) {
    const callbackURLTo = await getEndpointFn(destination, REQUEST_TYPE.PUT)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT)
    if (Config.IS_ISO_MODE && fromSwitch && action === Action.PREPARE_DUPLICATE) {
      payload = (await TransformFacades.FSPIOP.transfers.put({ body: fspiopObject })).body
    } else if (Config.IS_ISO_MODE && fromSwitch && action === Action.FX_PREPARE_DUPLICATE) {
      payload = (await TransformFacades.FSPIOP.fxTransfers.put({ body: fspiopObject })).body
    }
    headers = createCallbackHeaders({ dfspId: destination, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
    logger.verbose(`Notification::processMessage - Callback.sendRequest(${callbackURLTo}, ${PUT}, ${JSON.stringify(headers)}, ${payload}, ${id}, ${source}, ${destination})`)
    injectAuditQueryTags({ span, action, id, url: callbackURLTo, method: PUT, isFx, serviceName, ...(isFx ? { additionalTags: { determiningTransferId: fspiopObject.determiningTransferId } } : {}) })
    await sendHttpRequest({ apiType: API_TYPE, url: callbackURLTo, headers, source, destination, method: PUT, payload, responseType, span, jwsSigner, protocolVersions, hubNameRegex })
    return true
  }

  const sendToSource = Config.SEND_TRANSFER_CONFIRMATION_TO_PAYEE && source !== destination

  if ([Action.COMMIT, Action.RESERVE, Action.FX_COMMIT, Action.FX_RESERVE].includes(action) && isSuccess) {
    const callbackURLTo = await getEndpointFn(destination, REQUEST_TYPE.PUT)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT)
    // forward the fulfil to the destination
    logger.verbose(`Notification::processMessage - Callback.sendRequest({ ${callbackURLTo}, ${PUT}, ${JSON.stringify(headers)}, ${payload}, ${id}, ${source}, ${destination} ${hubNameRegex} })`)
    let response = { status: 'unknown' }
    const histTimerEndSendRequest = Metrics.getHistogram(
      'notification_event_delivery',
      'notification_event_delivery - metric for sending notification requests to FSPs',
      ['success', 'from', 'dest', 'action', 'status']
    ).startTimer()
    try {
      if (action === Action.RESERVE) {
        headers = createCallbackHeaders({ dfspId: destination, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, true)
        jwsSigner = getJWSSigner(Config.HUB_NAME)
        // In the case of a reserve, we don't want to send the original ISO payload back.
        // We want to send what the central ledger produced as the payload.
        let payloadForPayer = fspiopObject
        if (Config.IS_ISO_MODE) {
          payloadForPayer = (await TransformFacades.FSPIOP.transfers.put({ body: payloadForPayer })).body
        }
        injectAuditQueryTags({ span, action, id, url: callbackURLTo, method: PUT, isFx, serviceName })
        response = await sendHttpRequest({ apiType: API_TYPE, url: callbackURLTo, headers, source: Config.HUB_NAME, destination, method: PUT, payload: payloadForPayer, responseType, span, jwsSigner, protocolVersions, hubNameRegex })
      } else {
        headers = createCallbackHeaders({ dfspId: destination, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, false)
        injectAuditQueryTags({ span, action, id, url: callbackURLTo, method: PUT, isFx, serviceName })
        response = await sendHttpRequest({ apiType: API_TYPE, url: callbackURLTo, headers, source, destination, method: PUT, payload, responseType, span, protocolVersions, hubNameRegex })
      }
    } catch (err) {
      histTimerEndSendRequest({ success: false, from: source, dest: destination, action, status: response.status })
      histTimerEnd({ success: false, action })
      throw err
    }
    histTimerEndSendRequest({ success: true, from: source, dest: destination, action, status: response.status })

    // send an extra notification back to the original sender (if enabled in config) and ignore this for on-us transfers
    // todo: do we need this case for FX_RESERVE ?
    if ((action === Action.RESERVE) || (sendToSource && action !== Action.FX_RESERVE)) {
      let payloadForPayee = payload

      // In the case of a reserve, we don't want to send the original ISO payload back.
      // We want to send what the central ledger produced as the payload.
      if (action === Action.RESERVE) {
        payloadForPayee = fspiopObject
        if (payloadForPayee.fulfilment) {
          delete payloadForPayee.fulfilment
          if (Config.IS_ISO_MODE) {
            payloadForPayee = (await TransformFacades.FSPIOP.transfers.patch({ body: payloadForPayee })).body
          }
        }
        payloadForPayee = JSON.stringify(payloadForPayee)
      }

      const method = action === Action.RESERVE ? PATCH : PUT
      const callbackURLFrom = await getEndpointFn(source, REQUEST_TYPE.PUT)
      headers = createCallbackHeaders({ dfspId: source, transferId: id, headers: content.headers, httpMethod: method, endpointTemplate }, fromSwitch)
      logger.verbose(`Notification::processMessage - Callback.sendRequest({ ${callbackURLFrom}, ${method}, ${JSON.stringify(headers)}, ${payloadForPayee}, ${id}, ${Config.HUB_NAME}, ${source} ${hubNameRegex} })`)
      const histTimerEndSendRequest2 = Metrics.getHistogram(
        'notification_event_delivery',
        'notification_event_delivery - metric for sending notification requests to FSPs',
        ['success', 'from', 'dest', 'action', 'status']
      ).startTimer()
      let rv
      try {
        jwsSigner = getJWSSigner(Config.HUB_NAME)
        injectAuditQueryTags({ span, action, id, url: callbackURLFrom, method, isFx, serviceName })
        rv = await sendHttpRequest({ apiType: API_TYPE, url: callbackURLFrom, headers, source: Config.HUB_NAME, destination: source, method, payload: payloadForPayee, responseType, span, jwsSigner, protocolVersions, hubNameRegex })
      } catch (err) {
        histTimerEndSendRequest2({ success: false, dest: source, action, status: response.status })
        histTimerEnd({ success: false, action })
        throw err
      }
      histTimerEndSendRequest2({ success: true, dest: source, action, status: response.status })

      histTimerEnd({ success: true, action })
      return rv
    } else {
      logger.info(`Notification::processMessage - Action: ${action} - Skipping notification callback to original sender (${source}) because feature is disabled in config.`)
      histTimerEnd({ success: true, action })
      return true
    }
  }

  if ([Action.COMMIT, Action.FX_COMMIT].includes(action) && !isSuccess) {
    const callbackURLTo = await getEndpointFn(destination, REQUEST_TYPE.PUT_ERROR)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT_ERROR)
    headers = createCallbackHeaders({ dfspId: destination, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
    logger.verbose(`Notification::processMessage - Callback.sendRequest({ ${callbackURLTo}, ${PUT}, ${JSON.stringify(headers)}, ${payload}, ${id}, ${source}, ${destination}, ${hubNameRegex} })`)
    injectAuditQueryTags({ span, action, id, url: callbackURLTo, method: PUT, isFx, serviceName })
    await sendHttpRequest({ apiType: API_TYPE, url: callbackURLTo, headers, source, destination, method: PUT, payload, responseType, span, jwsSigner, protocolVersions, hubNameRegex })
    histTimerEnd({ success: true, action })
    return true
  }

  if ([Action.REJECT, Action.FX_REJECT].includes(action)) {
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT)
    const [, response] = await Promise.all([
      (async function notifyDestination () {
        const callbackURLTo = await getEndpointFn(destination, REQUEST_TYPE.PUT)
        headers = createCallbackHeaders({ dfspId: destination, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate })
        // forward the reject to the destination
        logger.verbose(`Notification::processMessage - Callback.sendRequest({ ${callbackURLTo}, ${PUT}, ${JSON.stringify(headers)}, ${payload}, ${id}, ${source}, ${destination} ${hubNameRegex} })`)
        injectAuditQueryTags({ span, action, id, url: callbackURLTo, method: PUT, isFx, serviceName })
        await sendHttpRequest({ apiType: API_TYPE, url: callbackURLTo, headers, source, destination, method: PUT, payload, responseType, span, protocolVersions, hubNameRegex })
      })(),
      // send an extra notification back to the original sender (if enabled in config) and ignore this for on-us transfers
      (async function notifySource () {
        if (sendToSource) {
          const callbackURLFrom = await getEndpointFn(source, REQUEST_TYPE.PUT)
          jwsSigner = getJWSSigner(Config.HUB_NAME)
          headers = createCallbackHeaders({ dfspId: source, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
          logger.verbose(`Notification::processMessage - Callback.sendRequest({ ${callbackURLFrom}, ${PUT}, ${JSON.stringify(headers)}, ${payload}, ${id}, ${Config.HUB_NAME}, ${source}, ${hubNameRegex} })`)
          injectAuditQueryTags({ span, action, id, url: callbackURLFrom, method: PUT, isFx, serviceName })
          return await sendHttpRequest({ apiType: API_TYPE, url: callbackURLFrom, headers, source: Config.HUB_NAME, destination: source, method: PUT, payload, responseType, span, jwsSigner, protocolVersions, hubNameRegex })
        } else {
          logger.info(`Notification::processMessage - Action: ${action} - Skipping notification callback to original sender (${source}) because feature is disabled in config.`)
          return true
        }
      })()
    ])

    histTimerEnd({ success: true, action })
    return response
  }

  if ([Action.ABORT, Action.FX_ABORT].includes(action)) {
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT_ERROR)
    const [, response] = await Promise.all([
      (async function notifyDestination () {
        const callbackURLTo = await getEndpointFn(destination, REQUEST_TYPE.PUT_ERROR)
        let fxAbortFromSwitch = false
        let fxAbortSource = source
        const finalHeaders = { ...content.headers }
        if (action === Action.FX_ABORT && !isOriginalId) {
          // In the case where the fx-abort message is generated by the switch off of a transfer abort request from a DFSP,
          // we need to modify the headers to have the correct content-type, source should be switch, and signature should be switch's.
          fxAbortFromSwitch = true
          fxAbortSource = Config.HUB_NAME
          // set content type header to fxTransfer if not already set
          if (!finalHeaders['content-type'].includes(Enum.Http.HeaderResources.FX_TRANSFERS)) {
            finalHeaders['content-type'] = makeAcceptContentTypeHeader(Enum.Http.HeaderResources.FX_TRANSFERS, Config.PROTOCOL_VERSIONS.CONTENT.DEFAULT, Config.API_TYPE)
          }
        }
        const fxAbortJwsSigner = fxAbortFromSwitch ? jwsSigner : null
        headers = createCallbackHeaders({ dfspId: destination, transferId: id, headers: finalHeaders, httpMethod: PUT, endpointTemplate }, fxAbortFromSwitch)

        // forward the abort to the destination
        logger.verbose(`Notification::processMessage - Callback.sendRequest({ ${callbackURLTo}, ${PUT}, ${JSON.stringify(headers)}, ${payload}, ${id}, ${fxAbortSource}, ${destination} ${hubNameRegex} })`)
        injectAuditQueryTags({ span, action, id, url: callbackURLTo, method: PUT, isFx, serviceName })
        await sendHttpRequest({ apiType: API_TYPE, url: callbackURLTo, headers, source: fxAbortSource, destination, method: PUT, payload, responseType, span, jwsSigner: fxAbortJwsSigner, protocolVersions, hubNameRegex })
      })(),
      (async function notifySource () {
        // send an extra notification back to the original sender (if enabled in config) and ignore this for on-us transfers
        if (sendToSource) {
          const callbackURLFrom = await getEndpointFn(source, REQUEST_TYPE.PUT_ERROR)
          jwsSigner = getJWSSigner(Config.HUB_NAME)
          let fxAbortFromSwitch = fromSwitch
          const finalHeaders = { ...content.headers }
          if (action === Action.FX_ABORT && !isOriginalId) {
            // In the case where the fx-abort message is generated by the switch off of a transfer abort request from a DFSP,
            // we need to modify the headers to have the correct content-type, source should be switch, and signature should be switch's.
            fxAbortFromSwitch = true
            // set content type header to fxTransfer if not already set
            if (!finalHeaders['content-type'].includes(Enum.Http.HeaderResources.FX_TRANSFERS)) {
              finalHeaders['content-type'] = makeAcceptContentTypeHeader(Enum.Http.HeaderResources.FX_TRANSFERS, Config.PROTOCOL_VERSIONS.CONTENT.DEFAULT, Config.API_TYPE)
            }
          }
          finalHeaders['fspiop-destination'] = source
          headers = createCallbackHeaders({ dfspId: source, transferId: id, headers: finalHeaders, httpMethod: PUT, endpointTemplate }, fxAbortFromSwitch)
          logger.verbose(`Notification::processMessage - Callback.sendRequest({ ${callbackURLFrom}, ${PUT}, ${JSON.stringify(headers)}, ${payload}, ${id}, ${Config.HUB_NAME}, ${source} ${hubNameRegex} })`)
          injectAuditQueryTags({ span, action, id, url: callbackURLFrom, method: PUT, isFx, serviceName })
          return await sendHttpRequest({ apiType: API_TYPE, url: callbackURLFrom, headers, source: Config.HUB_NAME, destination: source, method: PUT, payload, responseType, span, jwsSigner, protocolVersions, hubNameRegex })
        } else {
          logger.info(`Notification::processMessage - Action: ${action} - Skipping notification callback to original sender (${source}).`)
          return true
        }
      })()
    ])
    histTimerEnd({ success: true, action })
    return response
  }

  if ([Action.ABORT_VALIDATION, Action.FX_ABORT_VALIDATION].includes(action)) {
    const callbackURLTo = await getEndpointFn(destination, REQUEST_TYPE.PUT_ERROR)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT_ERROR)
    headers = createCallbackHeaders({ dfspId: destination, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
    // forward the abort to the destination
    jwsSigner = getJWSSigner(Config.HUB_NAME)
    logger.verbose(`Notification::processMessage - Callback.sendRequest({ ${callbackURLTo}, ${PUT}, ${JSON.stringify(headers)}, ${payload}, ${id}, ${source}, ${destination} ${hubNameRegex} })`)
    injectAuditQueryTags({ span, action, id, url: callbackURLTo, method: PUT, isFx, serviceName })
    await sendHttpRequest({ apiType: API_TYPE, url: callbackURLTo, headers, source: Config.HUB_NAME, destination, method: PUT, payload, responseType, span, jwsSigner, protocolVersions, hubNameRegex })

    // send an extra notification back to the original sender (if enabled in config) and ignore this for on-us transfers
    if (sendToSource && source !== Config.HUB_NAME) {
      const callbackURLFrom = await getEndpointFn(source, REQUEST_TYPE.PUT_ERROR)
      headers = createCallbackHeaders({ dfspId: source, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
      logger.verbose(`Notification::processMessage - Callback.sendRequest({ ${callbackURLFrom}, ${PUT}, ${JSON.stringify(headers)}, ${payload}, ${id}, ${Config.HUB_NAME}, ${source}, ${hubNameRegex} })`)
      injectAuditQueryTags({ span, action, id, url: callbackURLFrom, method: PUT, isFx, serviceName })
      await sendHttpRequest({ apiType: API_TYPE, url: callbackURLFrom, headers, source: Config.HUB_NAME, destination: source, method: PUT, payload, responseType, span, jwsSigner, protocolVersions, hubNameRegex })
      histTimerEnd({ success: true, action })
      return true
    } else {
      logger.info(`Notification::processMessage - Action: ${action} - Skipping notification callback to original sender (${source}).`)
    }
    histTimerEnd({ success: true, action })
    return true
  }

  // special event emitted by central-ledger when the Payee sent a status of `RESERVED` in PUT /transfers/{ID}
  // and the ledger failed to commit the transfer
  if ([Action.RESERVED_ABORTED, Action.FX_RESERVED_ABORTED].includes(action)) {
    if (parseFloat(Config.PROTOCOL_VERSIONS.CONTENT.DEFAULT) < 1.1) {
      logger.info(`Notification::processMessage - Action: ${action} - Skipping reserved_aborted notification callback (${source}).`)
      return
    }
    // TODO: this should possibly be address by a new endpoint-type FSPIOP_CALLBACK_URL_TRANSFER_PATCH, but for the time being lets avoid adding a new enum as we want to simplify the configurations and consolidate them instead in future.
    const callbackURLTo = await getEndpointFn(destination, REQUEST_TYPE.PUT)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT)
    const method = PATCH
    let payloadForPayee = fspiopObject
    if (Config.IS_ISO_MODE && fromSwitch && action === Action.RESERVED_ABORTED) {
      // In the case of a reserve, we don't want to send the original ISO payload back.
      // We want to send what the central ledger produced as the payload.
      payloadForPayee = (await TransformFacades.FSPIOP.transfers.patch({ body: fspiopObject })).body
    } else if (Config.IS_ISO_MODE && fromSwitch && action === Action.FX_RESERVED_ABORTED) {
      payloadForPayee = (await TransformFacades.FSPIOP.fxTransfers.patch({ body: fspiopObject })).body
    }
    headers = createCallbackHeaders({
      dfspId: destination,
      transferId: id,
      headers: content.headers,
      httpMethod: method,
      endpointTemplate
    }, fromSwitch)
    logger.verbose(`Notification::processMessage - Callback.sendRequest({ ${callbackURLTo}, ${method}, ${JSON.stringify(headers)}, ${payloadForPayee}, ${id}, ${Config.HUB_NAME}, ${source} ${hubNameRegex} })`)

    const histTimerEndSendRequest = Metrics.getHistogram(
      'notification_event_delivery',
      'notification_event_delivery - metric for sending notification requests to FSPs',
      ['success', 'from', 'dest', 'action', 'status']
    ).startTimer()

    let callbackResponse
    try {
      jwsSigner = getJWSSigner(Config.HUB_NAME)
      injectAuditQueryTags({ span, action, id, url: callbackURLTo, method, isFx, serviceName })
      callbackResponse = await sendHttpRequest({ apiType: API_TYPE, url: callbackURLTo, headers, source: Config.HUB_NAME, destination, method, payload: payloadForPayee, responseType, span, jwsSigner, protocolVersions, hubNameRegex })
    } catch (err) {
      histTimerEndSendRequest({ success: false, dest: source, action, status: callbackResponse && callbackResponse.status })
      histTimerEnd({ success: false, action })
      throw err
    }
    histTimerEndSendRequest({ success: true, dest: source, action, status: callbackResponse && callbackResponse.status })
    histTimerEnd({ success: true, action })
    return callbackResponse
  }

  if ([Action.FULFIL_DUPLICATE, Action.FX_FULFIL_DUPLICATE].includes(action)) {
    const callbackURLTo = isSuccess ? await getEndpointFn(destination, REQUEST_TYPE.PUT) : await getEndpointFn(destination, REQUEST_TYPE.PUT_ERROR)
    const endpointTemplate = isSuccess ? getEndpointTemplate(REQUEST_TYPE.PUT) : getEndpointTemplate(REQUEST_TYPE.PUT_ERROR)
    headers = createCallbackHeaders({ dfspId: destination, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
    logger.verbose(`Notification::processMessage - Callback.sendRequest({ ${callbackURLTo}, ${PUT}, ${JSON.stringify(headers)}, ${payload}, ${id}, ${source}, ${destination} ${hubNameRegex} })`)
    injectAuditQueryTags({ span, action, id, url: callbackURLTo, method: PUT, isFx, serviceName })
    await sendHttpRequest({ apiType: API_TYPE, url: callbackURLTo, headers, source, destination, method: PUT, payload, responseType, span, jwsSigner, protocolVersions, hubNameRegex })
    histTimerEnd({ success: true, action })
    return true
  }

  if ([Action.ABORT_DUPLICATE, Action.FX_ABORT_DUPLICATE].includes(action) && isSuccess) {
    const callbackURLTo = await getEndpointFn(destination, REQUEST_TYPE.PUT)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT)
    headers = createCallbackHeaders({ dfspId: destination, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate })
    logger.verbose(`Notification::processMessage - Callback.sendRequest({ ${callbackURLTo}, ${PUT}, ${JSON.stringify(headers)}, ${payload}, ${id}, ${source}, ${destination} ${hubNameRegex} })`)
    injectAuditQueryTags({ span, action, id, url: callbackURLTo, method: PUT, isFx, serviceName })
    await sendHttpRequest({ apiType: API_TYPE, url: callbackURLTo, headers, source, destination, method: PUT, payload, responseType, span, protocolVersions, hubNameRegex })
    histTimerEnd({ success: true, action })
    return true
  }

  if ([Action.ABORT_DUPLICATE, Action.FX_ABORT_DUPLICATE].includes(action) && !isSuccess) {
    const callbackURLTo = await getEndpointFn(destination, REQUEST_TYPE.PUT_ERROR)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT_ERROR)
    headers = createCallbackHeaders({ dfspId: destination, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
    logger.verbose(`Notification::processMessage - Callback.sendRequest({ ${callbackURLTo}, ${PUT}, ${JSON.stringify(headers)}, ${payload}, ${id}, ${source}, ${destination} ${hubNameRegex} })`)
    injectAuditQueryTags({ span, action, id, url: callbackURLTo, method: PUT, isFx, serviceName })
    await sendHttpRequest({ apiType: API_TYPE, url: callbackURLTo, headers, source, destination, method: PUT, payload, responseType, span, jwsSigner, protocolVersions, hubNameRegex })
    histTimerEnd({ success: true, action })
    return true
  }

  if ([Action.TIMEOUT_RECEIVED, Action.FX_TIMEOUT_RECEIVED].includes(action)) {
    const callbackURLTo = await getEndpointFn(destination, REQUEST_TYPE.PUT_ERROR)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT_ERROR)
    jwsSigner = getJWSSigner(Config.HUB_NAME)
    headers = createCallbackHeaders({ dfspId: destination, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
    logger.verbose(`Notification::processMessage - Callback.sendRequest({ ${callbackURLTo}, ${PUT}, ${JSON.stringify(headers)}, ${payload}, ${id}, ${Config.HUB_NAME}, ${destination}, ${hubNameRegex} })`)
    injectAuditQueryTags({ span, action, id, url: callbackURLTo, method: PUT, isFx, serviceName })
    await sendHttpRequest({ apiType: API_TYPE, url: callbackURLTo, headers, source: Config.HUB_NAME, destination, method: PUT, payload, responseType, span, jwsSigner, protocolVersions, hubNameRegex })
    histTimerEnd({ success: true, action })
    return true
  }

  if ([Action.TIMEOUT_RESERVED, Action.FX_TIMEOUT_RESERVED, Action.FORWARDED, Action.FX_FORWARDED].includes(action)) {
    const payerToNotify = content.context?.payer || destination
    const payeeToNotify = content.context?.payee || source
    const callbackURLTo = await getEndpointFn(payerToNotify, REQUEST_TYPE.PUT_ERROR)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PUT_ERROR)
    jwsSigner = getJWSSigner(Config.HUB_NAME)
    headers = createCallbackHeaders({ dfspId: payerToNotify, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
    logger.verbose(`Notification::processMessage - Callback.sendRequest({ ${callbackURLTo}, ${PUT}, ${JSON.stringify(headers)}, ${payload}, ${id}, ${Config.HUB_NAME}, ${payerToNotify}, ${hubNameRegex} })`)
    injectAuditQueryTags({ span, action, id, url: callbackURLTo, method: PUT, isFx, serviceName })
    await sendHttpRequest({ apiType: API_TYPE, url: callbackURLTo, headers, source: Config.HUB_NAME, destination: payerToNotify, method: PUT, payload, responseType, span, jwsSigner, protocolVersions, hubNameRegex })

    const callbackURLFrom = await getEndpointFn(payeeToNotify, REQUEST_TYPE.PUT_ERROR)
    headers = createCallbackHeaders({ dfspId: payeeToNotify, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
    logger.verbose(`Notification::processMessage - Callback.sendRequest({ ${callbackURLFrom}, ${PUT}, ${JSON.stringify(headers)}, ${payload}, ${id}, ${Config.HUB_NAME}, ${payeeToNotify}, ${hubNameRegex} })`)
    injectAuditQueryTags({ span, action, id, url: callbackURLFrom, method: PUT, isFx, serviceName })
    await sendHttpRequest({ apiType: API_TYPE, url: callbackURLFrom, headers, source: Config.HUB_NAME, destination: payeeToNotify, method: PUT, payload, responseType, span, jwsSigner, protocolVersions, hubNameRegex })

    histTimerEnd({ success: true, action })
    return true
  }

  if ([Action.GET, Action.FX_GET].includes(action)) {
    const callbackURLTo = isSuccess ? await getEndpointFn(destination, REQUEST_TYPE.PUT) : await getEndpointFn(destination, REQUEST_TYPE.PUT_ERROR)
    const endpointTemplate = isSuccess ? getEndpointTemplate(REQUEST_TYPE.PUT) : getEndpointTemplate(REQUEST_TYPE.PUT_ERROR)
    headers = createCallbackHeaders({ dfspId: destination, transferId: id, headers: content.headers, httpMethod: PUT, endpointTemplate }, fromSwitch)
    if (Config.IS_ISO_MODE && fromSwitch && action === Action.GET && isSuccess) {
      payload = (await TransformFacades.FSPIOP.transfers.put({ body: fspiopObject })).body
    } else if (Config.IS_ISO_MODE && fromSwitch && action === Action.FX_GET && isSuccess) {
      payload = (await TransformFacades.FSPIOP.fxTransfers.put({ body: fspiopObject })).body
    }
    logger.verbose(`Notification::processMessage - Callback.sendRequest (${action})...`, { callbackURLTo, headers, payload, id, source, destination, hubNameRegex })
    injectAuditQueryTags({ span, action, id, url: callbackURLTo, method: PUT, isFx, serviceName })
    await sendHttpRequest({ apiType: API_TYPE, url: callbackURLTo, headers, source, destination, method: PUT, payload, responseType, span, jwsSigner, protocolVersions, hubNameRegex })
    histTimerEnd({ success: true, action })
    return true
  }

  if (action === Action.FX_NOTIFY) {
    if (!isSuccess) {
      throw ErrorHandler.Factory.createFSPIOPError(
        ErrorHandler.Enums.FSPIOPErrorCodes.INTERNAL_SERVER_ERROR,
        'FX_NOTIFY action must be successful'
      )
    }

    const { url: callbackURLTo } = await getEndpointFn(destination, REQUEST_TYPE.PATCH, true)
    const endpointTemplate = getEndpointTemplate(REQUEST_TYPE.PATCH)

    const parsedOriginalPayload = JSON.parse(payload)

    if (Config.IS_ISO_MODE && parsedOriginalPayload?.TxInfAndSts?.ExctnConf) {
      delete parsedOriginalPayload.TxInfAndSts.ExctnConf
    } else if (parsedOriginalPayload.fulfilment) {
      delete parsedOriginalPayload.fulfilment
    }

    const payloadForFXP = JSON.stringify(parsedOriginalPayload)
    const method = PATCH
    headers = createCallbackHeaders({ dfspId: destination, transferId: id, headers: content.headers, httpMethod: method, endpointTemplate }, fromSwitch)
    if (!Config.IS_ISO_MODE) {
      headers['content-type'] = `application/vnd.interoperability.fxTransfers+json;version=${Util.resourceVersions[Enum.Http.HeaderResources.FX_TRANSFERS].contentVersion}`
    } else {
      headers['content-type'] = `application/vnd.interoperability.${Hapi.API_TYPES.iso20022}.fxTransfers+json;version=${Util.resourceVersions[Enum.Http.HeaderResources.FX_TRANSFERS].contentVersion}`
    }

    logger.verbose(`Notification::processMessage - Callback.sendRequest({ ${callbackURLTo}, ${method}, ${JSON.stringify(headers)}, ${payloadForFXP}, ${id}, ${Config.HUB_NAME}, ${source} ${hubNameRegex} })`)
    let response = { status: 'unknown' }
    const histTimerEndSendRequest = Metrics.getHistogram(
      'notification_event_delivery',
      'notification_event_delivery - metric for sending notification requests to FSPs',
      ['success', 'from', 'dest', 'action', 'status']
    ).startTimer()

    try {
      jwsSigner = getJWSSigner(Config.HUB_NAME)
      injectAuditQueryTags({ span, action, id, url: callbackURLTo, method, isFx, serviceName })
      response = await sendHttpRequest({ apiType: API_TYPE, url: callbackURLTo, headers, source, destination, method, payload: payloadForFXP, responseType, span, jwsSigner, protocolVersions, hubNameRegex })
    } catch (err) {
      logger.error('error in fx-notify Callback.sendRequest:', err)
      histTimerEndSendRequest({ success: false, from: source, dest: destination, action, status: response.status })
      histTimerEnd({ success: false, action })
      throw err
    }
    histTimerEndSendRequest({ success: true, from: source, dest: destination, action, status: response.status })
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
  return notificationConsumer.isConnected() && (PayloadCache ? PayloadCache.isConnected() : true)
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

  return Promise.all([notificationConsumer.disconnect(), PayloadCache?.disconnect()])
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
  isConnected,
  getJWSSigner // exported for testing only
}
