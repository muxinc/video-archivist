import { ConnectionManager, ConnectionOptions, getConnectionManager } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { buildServer } from './server'

const ormconfig: ConnectionOptions = require('./ormconfig');

(async () => {
  const server = await buildServer({
    hapi: {
      port: 13000,
    },
    
    prettyPrintLogs: true,
    dbOptions: ormconfig, 
  });
  
  await server.start();
})().catch(err => {
  // TODO: do something intelligent here
  console.log(err);
  process.exit(1);
})
