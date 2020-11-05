FROM node:14-alpine

RUN adduser --system --no-create-home appuser

RUN mkdir /app
RUN /tmp/.yarn-cache-100

RUN chown -R appuser /app
RUN chown -R appuser /tmp/.yarn-cache-100

USER appuser

WORKDIR /app
COPY /package.json /app/package.json
COPY /yarn.lock /app/yarn.lock
RUN yarn install

# TODO: multi-stage? is it worth it?
COPY ./. /app/

RUN yarn build

CMD echo PLEASE DO EITHER yarn start:http OR yarn start:jobs THANK YOU IN ADVANCE