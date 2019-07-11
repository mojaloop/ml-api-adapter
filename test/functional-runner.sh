#!/usr/bin/env bash
>&2 echo "--==== Functional Tests Runner ====--"

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
    echo " - APP_HOST: Application host name"
    echo " - APP_PORT: Application port"
    echo " - APP_TEST_HOST: Application test host"
    echo " - APP_DIR_TEST_RESULTS: Location of test results relative to the working directory"
    echo " - SIMULATOR_HOST: name to give the simulator container"
    echo " - SIMULATOR_IMAGE: docker image name of the simulator"
    echo " - SIMULATOR_IMAGE_TAG: Tag of the docker image"
    echo " - TEST_CMD: Interation test command to be executed"
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

>&2 echo "Executing Functional Tests for $APP_HOST ..."

>&2 echo "Creating local directory to store test results"
mkdir -p test/results

fkafka() {
	docker run --rm -i \
	  --link $KAFKA_HOST \
	  --env KAFKA_HOST="$KAFKA_HOST" \
	  --env KAFKA_ZOO_PORT="$KAFKA_ZOO_PORT" \
	  $KAFKA_CLI_IMAGE \
	  /bin/sh \
	  -c \
		"$@"
}

is_kafka_up() {
  fkafka -c 'kafka-topics.sh --list --zookeeper $KAFKA_HOST:$KAFKA_ZOO_PORT' > /dev/null 2>&1
#  fkafka -c 'env; kafka-topics.sh --list --zookeeper $KAFKA_HOST:$KAFKA_ZOO_PORT'
#  test_exit_code=$?
#  echo "is_kafka_up result = $test_exit_code"
#  return $test_exit_code
}

stop_docker() {
  >&2 echo "Kafka is shutting down $KAFKA_HOST"
  (docker stop $KAFKA_HOST && docker rm $KAFKA_HOST) > /dev/null 2>&1
  >&2 echo "$APP_HOST environment is shutting down"
  (docker stop $APP_HOST && docker rm $APP_HOST) > /dev/null 2>&1
  (docker stop $APP_TEST_HOST && docker rm $APP_TEST_HOST) > /dev/null 2>&1
  >&1 echo "$SIMULATOR_HOST environment is shutting down"
  (docker stop $SIMULATOR_HOST && docker rm $SIMULATOR_HOST) > /dev/null 2>&1
}

clean_docker() {
  stop_docker
  #  >&2 echo "Removing docker kafka image"
#  (docker rmi $DOCKER_IMAGE:$DOCKER_TAG) > /dev/null 2>&1
#  >&2 echo "Removing docker test image $DOCKER_IMAGE:$DOCKER_TAG"
#  (docker rmi $DOCKER_IMAGE:$DOCKER_TAG) > /dev/null 2>&1
}

fcurl() {
	docker run --rm -i \
		--link $APP_HOST \
		--entrypoint curl \
		"jlekie/curl:latest" \
        --output /dev/null --silent --head --fail \
		"$@"
}

fcurl_sim() {
	docker run --rm -i \
		--link $SIMULATOR_HOST \
		--entrypoint curl \
		"jlekie/curl:latest" \
        --output /dev/null --silent --head --fail \
		"$@"
}

is_api_up() {
    fcurl "http://$APP_HOST:$APP_PORT/health?"
}

# Use simulator to mock out the central-ledger health check
start_simulator () {
  docker run --rm -td \
    -p 8444:8444 \
    --name=$SIMULATOR_HOST \
    $SIMULATOR_IMAGE:$SIMULATOR_IMAGE_TAG
}

is_simulator_up() {
  fcurl_sim "http://${SIMULATOR_HOST}:8444/health?"
}


start_kafka()
{
   docker run -td -i \
   -p $KAFKA_ZOO_PORT:$KAFKA_ZOO_PORT \
   -p $KAFKA_BROKER_PORT:$KAFKA_BROKER_PORT \
   --name=$KAFKA_HOST \
   --env ADVERTISED_HOST=$KAFKA_HOST \
   --env ADVERTISED_PORT=$KAFKA_BROKER_PORT \
   --env CONSUMER_THREADS=$KAFKA_CONSUMER_THREADS \
   --env TOPICS=$KAFKA_TOPIC_1,$KAFKA_TOPIC_2 \
   --env ZK_CONNECT=$ZK_CONNECT_PATH \
   --env GROUP_ID=$KAFKA_GROUP_ID \
   $KAFKA_IMAGE
}

start_ml_api_adapter()
{
 docker run -d -i \
   --link $KAFKA_HOST \
   --link $SIMULATOR_HOST \
   --name $APP_HOST \
   --env KAFKA_HOST="$KAFKA_HOST" \
   --env KAFKA_BROKER_PORT="$KAFKA_BROKER_PORT" \
   --env MLAPI_ENDPOINT_HEALTH_URL="http://${SIMULATOR_HOST}:8444/health" \
   -p $APP_PORT:$APP_PORT \
   $DOCKER_IMAGE:$DOCKER_TAG \
   /bin/sh \
   -c "source test/.env; $APP_CMD"
}

run_test_command()
{
 >&2 echo "Running $APP_HOST Test command: $TEST_CMD"
 docker run -i \
   --link $APP_HOST \
   --name $APP_TEST_HOST \
   --env APP_HOST=$APP_HOST \
   --env HOST_IP="$APP_HOST" \
   --env KAFKA_HOST="$KAFKA_HOST" \
   --env MLAPI_ENDPOINT_HEALTH_URL="http://${SIMULATOR_HOST}:8444/health" \
   $DOCKER_IMAGE:$DOCKER_TAG \
   /bin/sh \
   -c "source test/.env; $TEST_CMD"
}

stop_docker

>&2 echo "Building Docker Image $DOCKER_IMAGE:$DOCKER_TAG with $DOCKER_FILE"
docker build --cache-from $DOCKER_IMAGE:$DOCKER_TAG -t $DOCKER_IMAGE:$DOCKER_TAG -f $DOCKER_FILE .
echo "result "$?""
if [ "$?" != 0 ]
then
  >&2 echo "Build failed...exiting"
  clean_docker
  exit 1
fi

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

>&2 printf "Starting up..."
until is_api_up; do
  >&2 printf "."
  sleep 5
done

run_test_command
test_exit_code=$?
>&2 echo "Test result.... $test_exit_code"

# >&2 echo "Displaying test logs"
# docker logs $APP_TEST_HOST

# >&2 echo "Displaying app logs"
# docker logs $APP_HOST

>&2 echo "Copy results to local directory"
docker cp $APP_TEST_HOST:$DOCKER_WORKING_DIR/$APP_DIR_TEST_RESULTS test

if [ "$test_exit_code" != 0 ]
then
 >&2 echo "Functional tests failed... exiting"
 # >&2 echo "Test environment logs..."
fi

clean_docker
exit "$test_exit_code"