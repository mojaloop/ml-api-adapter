#!/bin/sh

echo "** STARTUP - Checking for Broker connection..."

source /opt/wait-for/wait-for.env

echo "** TESTING ${WAIT_FOR_DB_KAFKA_BROKER}"

sh /opt/wait-for/wait-for.sh $WAIT_FOR_DB_KAFKA_BROKER -t 240 -- echo "** STARTUP - Kafka connection successful!"
