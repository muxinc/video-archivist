import { Octokit } from '@octokit/rest';
import * as Path from 'path';
import Bull from 'bull';
import { Logger } from 'pino';
import { Connection } from 'typeorm';
import { Bucket, File } from '@google-cloud/storage';

import { DataService } from '../../DataService';
import { ArchiveOffer } from '../../db/entities/ArchiveOffer.entity';
import { Video } from '../../db/entities/Video.entity';
import { DownloadVideoJobData } from './types';
import { Repo } from '../../db/entities/Repo.entity';
import { saveM3U8 } from './m3u8';
import { archiveFile } from './downloading';

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
        
        let video = await dataService.getVideoByOriginalURL(offer.url);

        if (video) {
          // we already have the video, so link it
          await linkVideo(logger, dataService, offer.repo!, video);
        } else {
          video = await downloadNewVideo(logger, videoStorageBucket, dataService, offer);
        }

        await dataService.markArchiveOfferAsProcessed(offer.id);
        logger.info({ videoId: video.id }, "Offer marked as processed. Done.");

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

async function linkVideo(
  logger: Logger,
  dataService: DataService,
  repo: Repo,
  video: Video,
) {
  logger = logger.child({ phase: 'linkVideo' });
  logger.info({ repoId: repo.id, videoId: video.id }, "Video is already archived, so adding it to the repo.");

  await dataService.linkVideoWithRepo(repo, video);
}

async function downloadNewVideo(
  logger: Logger,
  videoStorageBucket: Bucket,
  dataService: DataService,
  offer: ArchiveOffer,
): Promise<Video> {
  logger = logger.child({ phase: 'downloadNewVideo' });
  logger.info({ url: offer.url }, "Fetching video for upload.");

  const repo = offer.repo;
  if (!repo) {
    throw new Error("Got an offer without a Repo; did you forget a join?");
  }

  const archiveUrl = offer.url.endsWith('m3u8')
    ? await saveM3U8(logger, offer, videoStorageBucket)
    : await archiveFile(
      logger,
      offer.url,
      videoStorageBucket,
      // if we got something with a weird query string parameter, dump it
      `${ArchiveOffer.idToHash(offer.id)}${Path.extname(offer.url).split("?")[0]}`,
    );
  
  const video = await dataService.createVideo({
    acquiredFrom: `https://github.com/${offer.repo!.organizationName}/${offer.repo!.repositoryName}/issues/${offer.issueNumber}`,
    originalUrl: offer.url,
    archiveUrl,
    repos: [],
  });
  logger.info({ videoId: video.id }, "Video saved.");
  
  await dataService.linkVideoWithRepo(repo, video);
  logger.info({ videoId: video.id, repoId: repo.id }, "Video linked with repo.");

  return video;
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
    '```\n' + err.message + '\n```\n\n' +
    `If this doesn't look fatal, you can try to save this again with the command ` + 
    `\`@${botUsername} save ${ArchiveOffer.idToHash(offer.id)}\`. Reach out to Mux ` +
    `DevEx if you've got any questions!`;

  await octokit.issues.createComment({
    body,
    issue_number: offer.issueNumber,
    owner: offer.repo!.organizationName,
    repo: offer.repo!.repositoryName,
  });
}
