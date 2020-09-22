#! /usr/bin/env bash

ROOT="$(dirname "$0")"

cd "$ROOT" || exit 1

SVC_CMD=up

if [[ $1 == "--reset" ]]
then
  SVC_CMD=reset
fi

tmux \
  start-server \; \
  set -g mouse on \; \
  new-session "echo 'Waiting for docker to come up...'; sleep 5; cd backend; \"$SHELL\"" \; \
  send-keys "source ./.env && yarn start:dev" Enter \; \
  split-window -h "yarn run -s dev:http-tunnel; \"$SHELL\"" \; \
  split-window -v "yarn run -s dev:svc-${SVC_CMD}; \"$SHELL\"" \; \
  resize-pane -t 1 -y 20 \; \
  split-window -v -t 0 \; \
  send-keys 'sleep 2; export REMOTE_HOST=$(yarn run -s dev:http-tunnel:hostname)' Enter

# cleans up after users if they spam ctrl-C (the natural inclination)
tmux kill-session || true
