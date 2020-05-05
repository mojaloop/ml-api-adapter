#!/bin/bash

>&2 echo "--==== Integration Tests Runner ====--"

if [ $# -ne 1 ]; then
    echo ""
    echo "Usage: $0 {env-file}"
    echo "{env-file} must contain the following variables:"
    echo " - DOCKER_IMAGE: Name of Image"
    echo " - DOCKER_TAG: Tag/Version of Image"
    echo " - DOCKER_FILE: Recipe to be used for Docker build"
    echo " - DOCKER_WORKING_DIR: Docker working directory"
    echo " - KAFKA_IMAGE: Kafka image:tag"
    echo " - KAFKA_HOST: Kafka host"
    echo " - KAFKA_ZOO_PORT: Kafka host name"
    echo " - KAFKA_BROKER_PORT: Kafka container port"
    echo " - ENDPOINT_HOST: Endpoint host name"
    echo " - ENDPOINT_PORT: Endpoint port"
    echo " - ENDPOINT_CMD: Command to start endpoint server"
    echo " - APP_HOST: Application host name"
    echo " - APP_PORT: Application port"
    echo " - APP_TEST_HOST: Application test host"
    echo " - APP_DIR_TEST_RESULTS: Location of test results relative to the working directory"
    echo " - TEST_CMD: Interaction test command to be executed"
    echo ""
    echo " * IMPORTANT: Ensure you have the required env in the test/.env to execute the application"
    echo ""
    exit 1
fi
>&2 echo ""
>&2 echo "====== Loading environment variables ======"
cat $1
. $1
>&2 echo "==========================================="
>&2 echo ""

>&2 echo "Executing Integration Tests for $APP_HOST ..."

>&2 echo "Creating local directory to store test results"
mkdir -p test/results

fkafka() {
	docker run --rm -i \
	  --network $DOCKER_NETWORK \
    --link $KAFKA_HOST \
	  --env KAFKA_HOST="$KAFKA_HOST" \
    --env KAFKA_ZOO_PORT="$KAFKA_ZOO_PORT" \
	  taion809/kafka-cli \
	  /bin/sh \
	  -c \
		"$@"
}

is_kafka_up() {
  fkafka -c 'kafka-topics.sh --list --zookeeper $KAFKA_HOST:$KAFKA_ZOO_PORT' > /dev/null 2>&1
}

stop_docker() {
  >&2 echo "Kafka is shutting down $KAFKA_HOST"
  (docker stop $KAFKA_HOST && docker rm $KAFKA_HOST) > /dev/null 2>&1
  >&2 echo "$APP_HOST environment is shutting down"
  (docker stop $APP_HOST && docker rm $APP_HOST) > /dev/null 2>&1
  (docker stop $APP_TEST_HOST && docker rm $APP_TEST_HOST) > /dev/null 2>&1
  (docker stop $ENDPOINT_HOST && docker rm $ENDPOINT_HOST) > /dev/null 2>&1
  >&1 echo "$SIMULATOR_HOST environment is shutting down"
  (docker stop $SIMULATOR_HOST && docker rm $SIMULATOR_HOST) > /dev/null 2>&1
  >&1 echo "Deleting test network: $DOCKER_NETWORK"
  docker network rm integration-test-net
}

clean_docker() {
  stop_docker
}

start_kafka()
{
  docker run -td -i \
   -p $KAFKA_ZOO_PORT:$KAFKA_ZOO_PORT \
   -p $KAFKA_BROKER_PORT:$KAFKA_BROKER_PORT \
   --network $DOCKER_NETWORK \
   --name=$KAFKA_HOST \
   --env ADVERTISED_HOST=$KAFKA_HOST \
   --env ADVERTISED_PORT=$KAFKA_BROKER_PORT \
   --env CONSUMER_THREADS=1 \
   --env TOPICS=my-topic,some-other-topic \
   --env ZK_CONNECT=kafka7zookeeper:2181/root/path \
   --env GROUP_ID=ml-api-adapter \
   $KAFKA_IMAGE
}

start_ml_api_adapter()
{
  docker run -d -i \
   --link $KAFKA_HOST \
   --link $ENDPOINT_HOST \
   --link $SIMULATOR_HOST \
   --network $DOCKER_NETWORK \
   --name $APP_HOST \
   --env KAFKA_HOST="$KAFKA_HOST" \
   --env KAFKA_BROKER_PORT="$KAFKA_BROKER_PORT" \
   --env LOG_LEVEL=debug \
   -p $APP_PORT:$APP_PORT \
   $DOCKER_IMAGE:$DOCKER_TAG \
   /bin/sh \
   -c "source test/.env; $APP_CMD"
}

fcurl_api() {
	docker run --rm -i \
    --network $DOCKER_NETWORK \
		--link $APP_HOST \
    --link $SIMULATOR_HOST \
		--entrypoint curl \
		"appropriate/curl:latest" \
     --silent -I\
		"$@"
}


# Make sure the service is alive, not necessarily healthy
fcurl_api_alive() {
  RESPONSE_CODE=$(fcurl_api "$@" | grep HTTP/1.1 | awk {'print $2'})
  case ${RESPONSE_CODE} in
    200)
      echo 'true'
      ;;
    502)
      echo 'true'
      ;;
    *)
      echo 'false'
      ;;
  esac
}

is_api_up() {
  $(fcurl_api_alive "http://$APP_HOST:$APP_PORT/health?")
}


# Use simulator to mock out the central-ledger health check
start_simulator () {
  docker run --rm -td \
    -p 8444:8444 \
    --network $DOCKER_NETWORK \
    --name=$SIMULATOR_HOST \
    $SIMULATOR_IMAGE:$SIMULATOR_IMAGE_TAG
}

is_simulator_up() {
  fcurl_api "http://${SIMULATOR_HOST}:8444/health?"
}

run_test_command()
{
 >&2 echo "Running $APP_HOST Test command: $TEST_CMD"
 docker run -i \
   --link $KAFKA_HOST \
   --link $ENDPOINT_HOST \
   --link $APP_HOST \
   --network $DOCKER_NETWORK \
   --name $APP_TEST_HOST \
   --env APP_HOST=$APP_HOST \
   --env KAFKA_HOST="$KAFKA_HOST" \
   --env KAFKA_BROKER_PORT="$KAFKA_BROKER_PORT" \
   --env ENDPOINT_URL="http://$ENDPOINT_HOST:$ENDPOINT_PORT/notification" \
  $DOCKER_IMAGE:$DOCKER_TAG \
   /bin/sh \
   -c "source test/.env; $TEST_CMD"
}

start_test_endpoint()
{
 docker run -d -i \
   --name $ENDPOINT_HOST \
   --network $DOCKER_NETWORK \
   -p $ENDPOINT_PORT:$ENDPOINT_PORT \
   $DOCKER_IMAGE:$DOCKER_TAG \
   /bin/sh \
   -c "source test/.env; $ENDPOINT_CMD"
}

fcurl() {
	docker run --rm -i \
		--network $DOCKER_NETWORK \
    --link $ENDPOINT_HOST \
		--entrypoint curl \
		"appropriate/curl:latest" \
      --output /dev/null --silent --head --fail \
		"$@"
}

is_endpoint_up() {
    fcurl "http://$ENDPOINT_HOST:$ENDPOINT_PORT?"
}

clean_docker

>&2 echo "Building Docker Image $DOCKER_IMAGE:$DOCKER_TAG with $DOCKER_FILE"
docker build --cache-from $DOCKER_IMAGE:$DOCKER_TAG -t $DOCKER_IMAGE:$DOCKER_TAG -f $DOCKER_FILE .
echo "result "$?""
if [ "$?" != 0 ]
then
  >&2 echo "Build failed...exiting"
  clean_docker
  exit 1
fi

>&1 echo "Creating test network: $DOCKER_NETWORK"
docker network create $DOCKER_NETWORK

>&2 echo "Kafka is starting"
start_kafka

if [ "$?" != 0 ]
then
  >&2 echo "Starting Kafka failed...exiting"
  clean_docker
  exit 1
fi

>&2 echo "Waiting for Kafka to start"
until is_kafka_up; do
  >&2 printf "."
  sleep 5
done


>&2 echo "starting test endpoint"
start_test_endpoint

if [ "$?" != 0 ]
then
  >&2 echo "start test endpoint failed...exiting"
  clean_docker
  exit 1
fi

>&2 echo "Waiting for endpoint to start"
until is_endpoint_up; do
  >&2 printf "."
  sleep 5
done

>&2 echo "Simulator is starting"
start_simulator

if [ "$?" != 0 ]
then
  >&2 echo "Starting Simulator failed...exiting"
  clean_docker
  exit 1
fi

>&2 echo "Waiting for Simulator to start"
until is_simulator_up; do
  >&2 printf "."
  sleep 5
done

>&2 echo "Starting ml api adapter"
start_ml_api_adapter

>&2 printf "Waiting for ml api adapter to start..."
until $(is_api_up); do
  >&2 printf "."
  sleep 5
done

>&2 echo "Integration tests are starting"
run_test_command
test_exit_code=$?
>&2 echo "Test result.... $test_exit_code ..."

# >&2 echo "Displaying test logs"
# docker logs $APP_TEST_HOST

# >&2 echo "Displaying endpoint logs"
# docker logs $ENDPOINT_HOST

>&2 echo "Copy results to local directory"
docker cp $APP_TEST_HOST:$DOCKER_WORKING_DIR/$APP_DIR_TEST_RESULTS test

if [ "$test_exit_code" != 0 ]
then
 >&2 echo "Integration tests failed...exiting"
 >&2 echo "Test environment logs..."
fi

clean_docker
exit "$test_exit_code"
