import { ConnectionOptions } from 'typeorm';
import * as GetEnv from 'getenv';

import { buildServer } from './http/server'

const ormconfig: ConnectionOptions = require('./ormconfig');

(async () => {
  const server = await buildServer({
    hapi: {
      port: GetEnv.int('HAPI_PORT', 13000),
    },
    
    prettyPrintLogs: true,
    dbOptions: ormconfig,
    githubAccessToken: GetEnv.string('GITHUB_ACCESS_TOKEN'),
  });
  
  await server.start();
})().catch(err => {
  // TODO: do something intelligent here
  console.log(err);
  process.exit(1);
})
