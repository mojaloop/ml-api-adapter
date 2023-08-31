module.exports = {
  "HOSTNAME": "http://ml-api-adapter",
  "ENDPOINT_SOURCE_URL": "http://central-ledger:3001",
  "ENDPOINT_HEALTH_URL": "http://central-ledger:3001/health",
  "KAFKA": {
    "CONSUMER": {
      "NOTIFICATION": {
        "EVENT": {
          "config": {
            "rdkafkaConf": {
              "metadata.broker.list": "kafka:29092"
            }
          }
        }
      }
    },
    "PRODUCER": {
      "TRANSFER": {
        "PREPARE": {
          "config": {
            "rdkafkaConf": {
              "metadata.broker.list": "kafka:29092"
            }
          }
        },
        "FULFIL": {
          "config": {
            "rdkafkaConf": {
              "metadata.broker.list": "kafka:29092"
            }
          }
        },
        "GET": {
          "config": {
            "rdkafkaConf": {
              "metadata.broker.list": "kafka:29092"
            }
          }
        }
      }
    }
  }
}
