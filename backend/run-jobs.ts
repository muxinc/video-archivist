import 'source-map-support';

import Pino from 'pino';
import * as fs from 'fs';
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


let tempGCPCredsPath: string | null = null;

(async () => {
  LOGGER.info("----- NEW APPLICATION START -----");
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    // google does not really give us an awesome way to specify a creds json as an env var

    const tempDir = fs.mkdtempSync("pp-gcp-");
    tempGCPCredsPath = `${tempDir}/gcp-credentials.json`;
    fs.writeFileSync(tempGCPCredsPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, { encoding: 'utf-8' });
  
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempGCPCredsPath;
  }
  
  const REDIS_HOST = GetEnv.string('REDIS_HOST');
  const REDIS_PORT = GetEnv.int('REDIS_PORT', 6379);

  const ormconfig: ConnectionOptions = require('./ormconfig');
  const typeorm = await createConnection(ormconfig);

  const queues = new Queues(
    LOGGER,
    { host: REDIS_HOST, port: REDIS_PORT },
  );

  const gcpStorage = new Storage({
    scopes: [
      'storage.objects.get',
      'storage.objects.delete',
      'storage.objects.create',
    ],
  });
  queues.runProcessors(
    typeorm,
    new Octokit({
      auth: GetEnv.string('GITHUB_ACCESS_TOKEN'),
    }),
    gcpStorage.bucket(GetEnv.string('VIDEO_BUCKET_NAME')),
    GetEnv.string('VIDEO_URL_BASE'),
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
}).finally(() => {
  if (tempGCPCredsPath) {
    fs.unlinkSync(tempGCPCredsPath);
  }
})
