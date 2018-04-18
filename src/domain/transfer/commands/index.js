'use strict'

const Translator = require('../translator')
const Events = require('../../../lib/events')
// const Config = require('../../../lib/config')
const Logger = require('@mojaloop/central-services-shared').Logger
const Producer = require('@mojaloop/central-services-shared').Kafka.Producer
const UrlParser = require('../../../lib/urlparser')
//const Errors = require('../../errors')

const publishPrepare = async (message) => {
  Logger.info('publishPrepare::start')
  var kafkaProducer = new Producer()
  var connectionResult = await kafkaProducer.connect()
  Logger.info(`Connected result=${connectionResult}`)
  if(connectionResult){
    await kafkaProducer.sendMessage('test', {test: 'test'}, '1234', 'testAccountSender', 'testAccountReciever', {date: new Date()}, 'application/json', ' ').then(results => {
      Logger.info(`testProducer.sendMessage:: result:'${JSON.stringify(results)}'`)
      if(results){
        resolve("202")
      } else {
        reject("Not able to send the message")
      }
    })
  } else {
    reject("Not succesful in connecting to kafka cluster")
  }
  
}

// *** POC prepare function that publishes messages to Kafka topics
const prepare = async (message) => {
  const {id, ledger, debits, credits, execution_condition, expires_at} = message
  var t = Translator.fromPayload(message)
  Logger.info(`L1p-Trace-Id=${t.id} - Transfers.Commands.prepare::start`)
  const existingTransfer = await Query.getById(UrlParser.idFromTransferUri(message.id))
  if (existingTransfer) {
    Logger.info('Transfer.Command.prepare.duplicateTransfer:: existingTransfer= %s', JSON.stringify(existingTransfer))
    Logger.info(`L1p-Trace-Id=${t.id} - Transfers.Commands.prepare::end`)
    return {
      existing: true,
      transfer: Translator.toTransfer(existingTransfer)
    }
  }
  message.timeline = {
    prepared_at: new Date()
  }
  return new Promise((resolve, reject) => {
    // Logger.info(`Transfers.Commands.prepare:: message='${message}'`)
    // const {id, ledger, debits, credits, execution_condition, expires_at} = message
    // var t = Translator.fromPayload(message)
    // t = Translator.toTransfer(message)
    // Logger.info(`L1p-Trace-Id=${t.id} - Transfers.Commands.prepare::start`)
    var topic = Kafka.getPrepareTxTopicName(t)
    // Logger.info('Transfers.Commands.prepare:: emit PublishMessage(%s, %s, %s)', topic, id, JSON.stringify(t))
    // Events.emitPublishMessage(topic, id, t)
    // return resolve({ existing: result.existing, transfer: t })
    // return Kafka.send(topic, id, t).then(result => {
    return Kafka.Producer.send({topic, key: id, message: JSON.stringify(message)}).then(result => {
      var response = {}
      message.state = 'prepared'
      if (result) {
        response = {status: 'pending', existing: false, transfer: message}
        Logger.info(`Transfers.Commands.prepare:: result='${JSON.stringify(response)}'`)
        Logger.info(`L1p-Trace-Id=${t.id} - Transfers.Commands.prepare::end`)
        return resolve(response)
      } else {
        response = {status: 'pending-failed', existing: false, transfer: message}
        Logger.info(`Transfers.Commands.prepare:: result='${JSON.stringify(response)}'`)
        return reject(response)
      }
    }).catch(reason => {
      Logger.error(`Transfers.Commands.prepare:: ERROR:'${reason}'`)
      return reject(reason)
    })
  })
}

// *** POC prepare function that Consumes Prepare messages from Kafka topics
const prepareExecute = async (payload, done) => {
  return null
}

// *** POC prepare function that Consumes Prepare Notifications messages from Kafka topics
const prepareNotification = (payload, done) => {
  return null
}

const fulfill = (fulfillment) => {
  return null // Eventric.getContext().then(ctx => ctx.command('FulfillTransfer', fulfillment))
}

const reject = (rejection) => {
  return null // Eventric.getContext().then(ctx => ctx.command('RejectTransfer', rejection))
}

const settle = ({id, settlement_id}) => {
  return null // Eventric.getContext().then(ctx => ctx.command('SettleTransfer', {id, settlement_id}))
}

module.exports = {
  fulfill,
  prepare,
  prepareExecute,
  reject,
  settle,
  prepareNotification
}
