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
    echo " - APP_HOST: Application host name"
    echo " - APP_PORT: Application port"
    echo " - APP_TEST_HOST: Application test host"
    echo " - APP_DIR_TEST_RESULTS: Location of test results relative to the working directory"
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

>&2 echo "Executing Integration Tests for $APP_HOST ..."

>&2 echo "Creating local directory to store test results"
mkdir -p test/results

fkafka() {
	docker run --rm -i \
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
  (docker stop $REDIS_HOST && docker rm $REDIS_HOST) > /dev/null 2>&1
  (docker stop $REQUESTBIN_HOST && docker rm $REQUESTBIN_HOST) > /dev/null 2>&1
  (docker network disconnect $NETWORK_NAME $REQUESTBIN_HOST) > /dev/null 2>&1 
  (docker network rm $NETWORK_NAME) > /dev/null 2>&1  
}

clean_docker() {
  stop_docker
  #  >&2 echo "Removing docker kafka image"
#  (docker rmi $DOCKER_IMAGE:$DOCKER_TAG) > /dev/null 2>&1
#  >&2 echo "Removing docker test image $DOCKER_IMAGE:$DOCKER_TAG"
#  (docker rmi $DOCKER_IMAGE:$DOCKER_TAG) > /dev/null 2>&1
}


start_kafka()
{
   docker run -td -i \
   -p $KAFKA_ZOO_PORT:$KAFKA_ZOO_PORT \
   -p $KAFKA_BROKER_PORT:$KAFKA_BROKER_PORT \
   --name=$KAFKA_HOST \
   --env ADVERTISED_HOST=$KAFKA_HOST \
   --env ADVERTISED_PORT=$KAFKA_BROKER_PORT \
   --env CONSUMER_THREADS=1 \
   --env TOPICS=my-topic,some-other-topic \
   --env ZK_CONNECT=kafka7zookeeper:2181/root/path \
   --env GROUP_ID=mymirror \
   $KAFKA_IMAGE
}
run_test_command()
{
 >&2 echo "Running $APP_HOST Test command: $TEST_CMD"
 docker run -i \
   --link $KAFKA_HOST \
   --name $APP_TEST_HOST \
   --env APP_HOST=$APP_HOST \
   --env HOST_IP="$APP_HOST" \
   --env KAFKA_HOST="$KAFKA_HOST" \
   --env REQUESTBIN_URL="$REQUESTBIN_URL" \
  $DOCKER_IMAGE:$DOCKER_TAG \
   /bin/sh \
   -c "source test/.env; $TEST_CMD"
}


start_requestbin()
{
docker run -td -i \
  -p $REDIS_PORT:$REDIS_PORT \
  --net $NETWORK_NAME \
  --name $REDIS_HOST $REDIS_IMAGE

docker run -td -i \
  -p $REQUESTBIN_PORT:$REQUESTBIN_PORT \
  --link $REDIS_HOST \
  --net $NETWORK_NAME \
  --ip $REQUESTBIN_IP \
  --env REALM=prod \
  --env REDIS_URL="//$REDIS_IMAGE:$REDIS_PORT" \
  --name $REQUESTBIN_HOST \
   $REQUESTBIN_IMAGE  

}

is_requestbin_up() {
#  curl -X GET http://$REQUESTBIN_IP:$REQUESTBIN_PORT/ > /dev/null 2>&1
 output=$(curl -X POST http://$REQUESTBIN_IP:$REQUESTBIN_PORT/api/v1/bins)
 echo "OUTPUT: $output"
 SUFFIX=$(echo $output | grep -Po '(?<="name")\W*\K[^ ]*' | sed -e 's/,//' -e 's/"//')
 REQUESTBIN_URL=http://$REQUESTBIN_IP:$REQUESTBIN_PORT/$SUFFIX
 REQUESTBIN_URL=http://$REQUESTBIN_IP:$REQUESTBIN_PORT/1jj5lua1
#  REQUESTBIN_URL=http://172.20.0.7:8000/116ahfc1

 echo "Request URL $REQUESTBIN_URL"
}

create_network()
{
  docker network create --subnet=$SUBNET/16 $NETWORK_NAME
}


stop_docker

>&2 echo "Building Docker Image $DOCKER_IMAGE:$DOCKER_TAG with $DOCKER_FILE"
# docker build --no-cache -t $DOCKER_IMAGE:$DOCKER_TAG -f $DOCKER_FILE .
docker build -t $DOCKER_IMAGE:$DOCKER_TAG -f $DOCKER_FILE .
echo "result "$?""
if [ "$?" != 0 ]
then
  >&2 echo "Build failed...exiting"
  clean_docker
  exit 1
fi

>&2 echo "Creating network $NETWORK_NAME"
create_network
if [ "$?" != 0 ]
then
  >&2 echo "Creating network failed...exiting"
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


>&2 echo "starting requestbin"
start_requestbin

if [ "$?" != 0 ]
then
  >&2 echo "start requestbin failed...exiting"
  clean_docker
  exit 1
fi

>&2 echo "Waiting for requestbin to start"
until is_requestbin_up; do
  >&2 printf "."
  sleep 5
done

>&2 echo "Integration tests are starting"
run_test_command
test_exit_code=$?
>&2 echo "Test result.... $test_exit_code ..."


# >&2 echo "Displaying test logs"
# docker logs $APP_TEST_HOST

# >&2 echo "Displaying app logs"
# docker logs $APP_HOST

>&2 echo "Copy results to local directory"
docker cp $APP_TEST_HOST:$DOCKER_WORKING_DIR/$APP_DIR_TEST_RESULTS test

if [ "$test_exit_code" != 0 ]
then
 >&2 echo "Integration tests failed...exiting"
 >&2 echo "Test environment logs..."
fi
sleep 200
clean_docker
exit "$test_exit_code"
