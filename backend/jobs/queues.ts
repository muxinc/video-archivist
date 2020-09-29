import Bull from 'bull';
import * as TypeORM from 'typeorm';
import { RedisOptions } from 'ioredis';
import { Logger } from 'pino';
import { DOWNLOAD_VIDEO_JOB_NAME, makeDownloadVideoJobProcessor } from './download-video-job/job';
import { DownloadVideoJobData } from './download-video-job/types';
import { Octokit } from '@octokit/rest';
import { Bucket, Storage } from '@google-cloud/storage';

export const videoDownloadQueue = new Bull('video-download-queue', {
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
  }
});

export class Queues {
  private readonly logger: Logger;
  private readonly videoDownloadQueue: Bull.Queue;

  private readonly queues: ReadonlyArray<Bull.Queue>;

  constructor(
    logger: Logger,
    redis: RedisOptions,
  ) {
    this.logger = logger;

    this.videoDownloadQueue = new Bull('video-download-queue', { redis });

    this.queues = [videoDownloadQueue];
  }

  runProcessors(
    typeorm: TypeORM.Connection,
    octokit: Octokit,
    videoStorageBucket: Bucket,
  ) {
    makeDownloadVideoJobProcessor(this.logger, this.videoDownloadQueue, typeorm, octokit, videoStorageBucket);
  }

  async stopProcessors() {
    this.queues.forEach(q => q.close());
    return Promise.all(this.queues.map(q => q.whenCurrentJobsFinished()));
  }

  enqueueDownloadVideoJob(data: DownloadVideoJobData) {
    this.videoDownloadQueue.add(DOWNLOAD_VIDEO_JOB_NAME, data);
  }
}
