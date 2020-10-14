FROM node:14-alpine

RUN mkdir /app
WORKDIR /app
COPY /package.json /app/package.json
RUN yarn install

# TODO: multi-stage? is it worth it?
COPY ./. /app/

RUN yarn build

CMD echo PLEASE DO EITHER yarn start:http OR yarn start:jobs THANK YOU IN ADVANCE