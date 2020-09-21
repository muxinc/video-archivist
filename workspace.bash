#! /usr/bin/env bash

ROOT="$(dirname "$0")"

cd "$ROOT" || exit 1

tmux \
  start-server \; \
  set -g mouse on \; \
  new-session "echo 'Waiting for docker to come up...'; sleep 5; cd backend; \"$SHELL\"" \; \
  split-window -d -h "yarn run -s dev:up" \; \
  send-keys "source ./sample-local.env" Enter \; \
  send-keys "yarn start:dev" Enter \; \
  split-window -v

# cleans up after users if they spam ctrl-C (the natural inclination)
tmux kill-session || true
