import 'source-map-support';

import { ConnectionOptions } from 'typeorm';
import * as GetEnv from 'getenv';

import { buildServer } from './http/server'

const ormconfig: ConnectionOptions = require('./ormconfig');

console.log("GITHUB TOKEN GO BRR:", process.env.GITHUB_ACCESS_TOKEN);

(async () => {
  const server = await buildServer({
    hapi: {
      port: GetEnv.int('HAPI_PORT', 13000),
    },
    
    prettyPrintLogs: GetEnv.bool('PRETTY_PRINT_LOGS', false),
    dbOptions: ormconfig,
    githubAccessToken: GetEnv.string('GITHUB_ACCESS_TOKEN'),
    redisOptions: {
      host: GetEnv.string('REDIS_HOST'),
      port: GetEnv.int('REDIS_PORT', 6379),
    },
  });
  
  await server.start();
})().catch(err => {
  // TODO: do something intelligent here
  console.log(err);
  process.exit(1);
})
