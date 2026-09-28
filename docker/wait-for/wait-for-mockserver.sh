#!/bin/sh
# wait-for-mockserver.sh

source /opt/wait-for/wait-for.env

health_check() {
  # MockServer is isolated to the Docker test network and carries no credentials. NOSONAR
  curl --fail --silent -X GET "http://$WAIT_FOR_MOCK_HOST:$WAIT_FOR_MOCK_PORT"
  return $?
}

command() {
  # MockServer is isolated to the Docker test network and carries no credentials. NOSONAR
  curl --fail --silent -X PUT "http://$WAIT_FOR_MOCK_HOST:$WAIT_FOR_MOCK_PORT/expectation" -d '{ "httpRequest": { "method": ".*", "path": "/.*transfers.*" }, "times" : { "remainingTimes" : 0,	"unlimited" : true }, "timeToLive" : { "unlimited" : true }, "httpResponse": { "statusCode": 200, "body": "{}" } }'
  return $?
}

until health_check; do
  >&2 echo "mockserver is unavailable - sleeping"
  sleep 1
done

>&2 echo "mockserver is up - executing command"
command
