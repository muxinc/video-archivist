import { Octokit } from '@octokit/rest';
import * as Path from 'path';
import Bull from 'bull';
import { Logger } from 'pino';
import { Connection } from 'typeorm';
import Axios from 'axios';
import { Bucket, File } from '@google-cloud/storage';
import { Stream } from 'stream';
import sleep from 'sleep-promise';

import { DataService } from '../../DataService';
import { ArchiveOffer } from '../../db/entities/ArchiveOffer.entity';
import { Video } from '../../db/entities/Video.entity';
import { DownloadVideoJobData } from './types';

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
        
        const archiveUrl = offer.url.endsWith('m3u8')
          ? await saveM3U8(logger, offer, videoStorageBucket)
          : await saveFile(logger, offer, videoStorageBucket);
        
        const video = await dataService.createVideo({
          acquiredFrom: `https://github.com/${offer.repo!.organizationName}/${offer.repo!.repositoryName}/issues/${offer.issueNumber}`,
          originalUrl: offer.url,
          archiveUrl,
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
  const url = offer.url;
  // if we got something with a weird query string parameter, dump it
  const fileExt = Path.extname(url).split("?")[0];

  const bucketFile = bucket.file(`${ArchiveOffer.idToHash(offer.id)}${fileExt}`);
  logger.info({ url, archiveUrl: bucketFile.name }, "Archiving to object storage.");
  try {
    const remoteGet = await Axios.get<Stream>(offer.url, { responseType: 'stream' });
    console.log(remoteGet.data);
    if (remoteGet.status < 200 || 299 < remoteGet.status) {
      throw new Error(`Error retrieving ${url}: received status code ${remoteGet.status}.`);
    }

    const bucketStream = bucketFile.createWriteStream({
      metadata: {
        contentType: remoteGet.headers['content-type'] ?? 'video/*',
      },
    });

    const pipe = remoteGet.data.pipe(bucketStream, { end: true });

    // GCP does not like immediate ACL changes after the resource is uploaded. sigh?
    await sleep(2000);
    logger.debug("Making video file public.");
    await bucketFile.makePublic();

    const archiveUrl = `https://storage.googleapis.com/${bucket.name}/${bucketFile.name}`;
    logger.info({ archiveUrl }, "File archived to object storage.");
    return archiveUrl;
  } catch (err) {
    logger.warn({ err }, "Error caught in saveFile; removing bucket file if it has been created.");

    if (await bucketFile.exists()) {
      await bucketFile.delete();
    }

    throw err;
  }
}

async function saveM3U8(logger: Logger, offer: ArchiveOffer, bucket: Bucket): Promise<string> {
  throw new Error("M3U8 not implemented yet");
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
    '```' + err.message + '\n```\n\n' +
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
