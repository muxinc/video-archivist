import * as Hapi from '@hapi/hapi';
import HapiPino from 'hapi-pino';
import HapiSwagger from 'hapi-swagger';
import HapiInert from '@hapi/inert';
import HapiVision from '@hapi/vision';
import * as HapiTypeorm from 'hapi-typeorm';

import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

import { attachRoutes } from './routes';
import { DataService } from './DataService';

const GithubWebhooksPlugin = require('hapi-github-webhooks');

export type AppOptions = {
  hapi: Hapi.ServerOptions,
  
  githubWebhookSecret: string,
  dbOptions: PostgresConnectionOptions,
  prettyPrintLogs: boolean | undefined,
}

export async function buildServer(opts: AppOptions): Promise<Hapi.Server> {
  const server = Hapi.server(opts.hapi);
  
  await attachPreMiddlewares(server, opts);
  await attachRoutes(server, opts);
  await attachMiddlewares(server, opts);
  
  return server;
}

async function attachPreMiddlewares(server: Hapi.Server, opts: AppOptions) {
  await server.register(GithubWebhooksPlugin);
  server.auth.strategy('githubwebhook', 'githubwebhook', { secret: opts.githubWebhookSecret });

  await server.register(DataService.hapiPlugin);
  
  await server.register([{
    plugin: HapiTypeorm.plugin,
    options: {
      connections: [opts.dbOptions],
    },
  }]);
}

async function attachMiddlewares(server: Hapi.Server, opts: AppOptions) {
  await server.register([
    HapiInert, HapiVision,
  ]);
  
  await server.register({
    plugin: HapiPino,
    options: {
      prettyPrint: opts.prettyPrintLogs,
    },
  });
  
  await server.register({
    plugin: HapiSwagger,
    options: {
      info: {
        title: 'playbackproblems API',
      },
    },
  });
}
