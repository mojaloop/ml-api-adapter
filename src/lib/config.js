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

 --------------
 ******/

const RC = require('rc')('CLEDG', require('../../config/default.json'))

module.exports = {
  UV_THREADPOOL_SIZE: RC.UV_THREADPOOL_SIZE,
  HOSTNAME: RC.HOSTNAME.replace(/\/$/, ''),
  PORT: RC.PORT,
  DATABASE_URI: RC.DATABASE_URI,
  AMOUNT: RC.AMOUNT,
  ENABLE_TOKEN_AUTH: RC.ENABLE_TOKEN_AUTH === 'true',
  ENABLE_BASIC_AUTH: RC.ENABLE_BASIC_AUTH === 'true',
  LEDGER_ACCOUNT_NAME: RC.LEDGER_ACCOUNT_NAME,
  LEDGER_ACCOUNT_PASSWORD: RC.LEDGER_ACCOUNT_PASSWORD,
  LEDGER_ACCOUNT_EMAIL: RC.LEDGER_ACCOUNT_NAME + '@test.com',
  ADMIN_SECRET: RC.ADMIN_SECRET,
  ADMIN_KEY: RC.ADMIN_KEY,
  ADMIN_PORT: RC.ADMIN_PORT,
  TOKEN_EXPIRATION: RC.TOKEN_EXPIRATION,
  EXPIRES_TIMEOUT: RC.EXPIRES_TIMEOUT,
  SIDECAR: RC.SIDECAR,
  SIDECAR_DISABLED: RC.SIDECAR.DISABLED === 'true',
  EMAIL_USER: RC.EMAIL_USER,
  EMAIL_PASSWORD: RC.EMAIL_PASSWORD,
  EMAIL_SMTP: RC.EMAIL_SMTP,
  TOPICS_KAFKA_ZOOKEEPER_HOSTS: RC.TOPICS.KAFKA.ZOOKEEPER.HOSTS,
  TOPICS_KAFKA_PRODUCER_OPTIONS: RC.TOPICS.KAFKA.PRODUCER.OPTIONS,
  TOPICS_KAFKA_PRODUCER_OPTIONS_NOTFIY: RC.TOPICS.KAFKA.PRODUCER['OPTIONS.NOTFIY'],
  TOPICS_KAFKA_CONSUMER_CONFIG: RC.TOPICS.KAFKA.CONSUMER.CONFIG,
  TOPICS_KAFKA_CONSUMER_OPTIONS: RC.TOPICS.KAFKA.CONSUMER.OPTIONS,
  TOPICS_KAFKA_CONSUMER_OPTIONS_NOTFIY: RC.TOPICS.KAFKA.CONSUMER['OPTIONS.NOTFIY'],
  TOPICS_PREPARE_TX_TEMPLATE: RC.TOPICS.PREPARE.TX.TEMPLATE,
  TOPICS_PREPARE_TX_REGEX: RC.TOPICS.PREPARE.TX.REGEX,
  TOPICS_PREPARE_NOTIFICATION_TEMPLATE: RC.TOPICS.PREPARE.NOTIFICATION.TEMPLATE,
  TOPICS_PREPARE_NOTIFICATION_REGEX: RC.TOPICS.PREPARE.NOTIFICATION.REGEX,
  TOPICS_PREPARE_POSITION_TEMPLATE: RC.TOPICS.PREPARE.POSITION.TEMPLATE,
  TOPICS_PREPARE_POSITION_REGEX: RC.TOPICS.PREPARE.POSITION.REGEX
}
