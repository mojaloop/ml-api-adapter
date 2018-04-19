'use strict'

const Translator = require('../translator')
const Events = require('../../../lib/events')
const Logger = require('@mojaloop/central-services-shared').Logger
const Producer = require('@mojaloop/central-services-shared').Kafka.Producer
const UrlParser = require('../../../lib/urlparser')

const publishPrepare = async (message) => {
  Logger.info('publishPrepare::start')
  var kafkaProducer = new Producer()
  var connectionResult = await kafkaProducer.connect()
  Logger.info(`Connected result=${connectionResult}`)
  if(connectionResult){

    let messageProtocol = {
      content: message,
      id: message.transferId,
      to: message.payeeFsp,
      from: message.payerFsp,
      metadata: {
        date: new Date()
      },
      type: 'application/json'
    }
    let topicConfig = {
      topicName: 'transfer'
    }
    return await kafkaProducer.sendMessage(messageProtocol, topicConfig)
    .then (result => {
        Logger.info('about to put messages to kafka topic: %s', result)
        return result
      }
    ).catch(err => {
      Logger.error(`Kafka error:: ERROR:'${err}'`)
      throw err
    })
    Logger.info('shld not come here')
  } else {
    reject("Not succesful in connecting to kafka cluster")
  }
  
}

module.exports = {
<<<<<<< HEAD
  publishPrepare
}
=======
  fulfill,
  prepare,
  publishPrepare,
  prepareExecute,
  reject,
  settle,
  prepareNotification
}
>>>>>>> origin/story156-shashi
