import Pino from 'pino';
import { createConnection } from 'typeorm';
import * as GetEnv from 'getenv';
import sleep from 'sleep-promise';

import { Queues } from './jobs/queues';
import { ConnectionOptions } from 'typeorm';
import { Octokit } from '@octokit/rest';
import { Storage } from '@google-cloud/storage';

const LOGGER = Pino({
  name: 'oopsdotvideo-jobs',
  level: 'info',
});

(async () => {
  const REDIS_HOST = GetEnv.string('REDIS_HOST');
  const REDIS_PORT = GetEnv.int('REDIS_PORT', 6379);

  const ormconfig: ConnectionOptions = require('./ormconfig');
  const typeorm = await createConnection(ormconfig);

  const queues = new Queues(
    LOGGER,
    { host: REDIS_HOST, port: REDIS_PORT },
  );

  const gcpStorage = new Storage();
  queues.runProcessors(
    typeorm,
    new Octokit({
      auth: GetEnv.string('GITHUB_ACCESS_TOKEN'),
    }),
    gcpStorage.bucket(GetEnv.string('VIDEO_BUCKET_NAME')),
  );

  let isRunning = true;
  process.on('SIGINT', async () => {
    LOGGER.info("SIGINT caught; stopping processors.");
    await queues.stopProcessors();
    LOGGER.info("Processors stopped.");
    isRunning = false;
  });

  while (isRunning) {
    await sleep(500);
  }

  LOGGER.info("Exiting main function.");
})().then(() => {
  LOGGER.info("Process exited successfully.");
  process.exit(0);
}).catch((err) => {
  LOGGER.error({ err }, "Process had an uncaught exception at the root.");
  process.exit(1);
})
