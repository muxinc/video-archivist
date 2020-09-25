import { Octokit } from '@octokit/rest';
import Bull from 'bull';
import { Logger } from 'pino';
import { Connection } from 'typeorm';
import * as Request from 'request';
import { v4 as uuidV4 } from 'uuid';

import { DataService } from '../../DataService';
import { ArchiveOffer } from '../../db/entities/ArchiveOffer.entity';
import { Video } from '../../db/entities/Video.entity';
import { DownloadVideoJobData } from './types';
import { Bucket } from '@google-cloud/storage';

export const DOWNLOAD_VIDEO_JOB_NAME = 'download-video-job';

export function makeDownloadVideoJobProcessor(
  baseLogger: Logger,
  queue: Bull.Queue,
  typeorm: Connection,
  octokit: Octokit,
  videoStorageBucket: Bucket,
) {
  const baseJobLogger = baseLogger.child({ job: DOWNLOAD_VIDEO_JOB_NAME });
  baseJobLogger.debug("Initializing.");

  queue.process(DOWNLOAD_VIDEO_JOB_NAME, async (job) => {
    let logger = baseJobLogger.child({ jid: job.id });
    try {
      const payload = DownloadVideoJobData.check(job.data);
      const { archiveOfferId } = payload;
      logger = logger.child({ archiveOfferId });

      logger.debug(`Fetching video for offer ${archiveOfferId}.`);

      const dataService = new DataService(logger, typeorm);
      const offer = await dataService.getArchiveOffer(archiveOfferId);

      if (!offer) {
        logger.error("No offer found for this ID. Bailing out.");
        return;
      }

      if (offer.processed) {
        logger.info("Offer already processed. Bailing out.");
        return;
      }

      try {
        logger.info({ url: offer.url }, "Fetching video for upload.");
        
        const savedUrl = offer.url.endsWith('m3u8')
          ? await saveM3U8(logger, offer, videoStorageBucket)
          : await saveFile(logger, offer, videoStorageBucket);
        
        const video = await dataService.createVideo({
          acquiredFrom: `https://github.com/${offer.repo!.organizationName}/${offer.repo!.repositoryName}/issues/${offer.issueNumber}`,
          originalUrl: offer.url,
          repos: [offer.repo!],
        });
        logger.info({ videoId: video.id }, "Video saved.");

        await dataService.markArchiveOfferAsProcessed(offer.id);
        logger.info("Offer marked as processed. Done.");

        await sendSuccessMessage(offer, video, octokit);
        logger.info("Archive job complete.");
      } catch (err) {
        await sendErrorMessage(err, offer, octokit);
        logger.info("Failed")
        throw err;
      }

    } catch (err) {
      logger.warn({ err }, "Error during job.");
      throw err;
    }
  });
}

async function saveFile(logger: Logger, offer: ArchiveOffer, bucket: Bucket): Promise<string> {
  throw new Error();
}

async function saveM3U8(logger: Logger, offer: ArchiveOffer, bucket: Bucket): Promise<string> {
  throw new Error();
}

async function sendSuccessMessage(offer: ArchiveOffer, video: Video, octokit: Octokit) {
  const body =
    `OK, we've archived ${ArchiveOffer.idToHash(offer.id)} (${offer.url}) over at ${video.archiveUrl} ` +
    `and we'll keep it there for future reference.`;
  
  await octokit.issues.createComment({
    body,
    issue_number: offer.issueNumber,
    owner: offer.repo!.organizationName,
    repo: offer.repo!.repositoryName,
  });
}

async function sendErrorMessage(err: Error, offer: ArchiveOffer, octokit: Octokit) {
  const botUsername = (await octokit.users.getAuthenticated()).data.login;
  const body =
    `Unfortunately, trying to archive ${offer.url} failed with the following error:\n\n` +
    err.message + '\n\n' +
    `You can try to save this again with the command \`@${botUsername} save ${ArchiveOffer.idToHash(offer.id)}\`.`;

  await octokit.issues.createComment({
    body,
    issue_number: offer.issueNumber,
    owner: offer.repo!.organizationName,
    repo: offer.repo!.repositoryName,
  });
}
