import * as Hapi from '@hapi/hapi';
import HapiPino from 'hapi-pino';
import HapiSwagger from 'hapi-swagger';
import HapiInert from '@hapi/inert';
import HapiVision from '@hapi/vision';
import * as HapiTypeorm from 'hapi-typeorm';

import { ConnectionOptions } from 'typeorm';

import { attachRoutes } from './routes';
import { DataService } from '../DataService';
import { GithubService } from '../GithubService';
import { debug } from 'console';
import IORedis from 'ioredis';

export type AppOptions = {
  hapi: Hapi.ServerOptions,
  
  dbOptions: ConnectionOptions,
  redisOptions: IORedis.RedisOptions,
  prettyPrintLogs: boolean | undefined,
  githubAccessToken: string,
}

export async function buildServer(opts: AppOptions): Promise<Hapi.Server> {
  const server = Hapi.server({
    ...opts.hapi,
  });
  
  await attachPreMiddlewares(server, opts);
  await attachRoutes(server, opts);
  await attachAppServices(server, opts);
  
  return server;
}

async function attachPreMiddlewares(server: Hapi.Server, opts: AppOptions) {
  await server.register({ plugin: require('hapi-x-request-id') });
  await server.register({
    plugin: HapiPino,
    options: {
      level: 'debug',
      prettyPrint: opts.prettyPrintLogs,
      mergeHapiLogData: true,
      logRequestStart: true,
      getChildBindings: (req: Hapi.Request) => ({ reqId: (req as any).id }),
    },
  });

  await server.register([HapiInert, HapiVision]);
  
  await server.register({
    plugin: HapiSwagger,
    options: {
      info: {
        title: 'playbackproblems API',
      },
    },
  });

  await server.register([{
    plugin: HapiTypeorm.plugin,
    options: {
      connections: [opts.dbOptions],
    },
  }]);
}

async function attachAppServices(server: Hapi.Server, opts: AppOptions) {
  await server.register({ plugin: DataService.hapiPlugin });
  await server.register([{
    plugin: GithubService.hapiPlugin,
    options: {
      accessToken: opts.githubAccessToken,
      redisOptions: opts.redisOptions,
    },
  }]);
}
