import { Bucket, File } from '@google-cloud/storage';
import { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';
import * as Path from 'path';

import { ArchiveOffer } from '../../db/entities/ArchiveOffer.entity';
import { archiveFile, downloadFileAsText, uploadTextAsFile } from './downloading';
import { Counter } from './Counter';

export type MungeM3U8File = { originalUrl: string, targetPath: string };
export type MungeM3U8Result = {
  mungedText: string,
  files: Array<MungeM3U8File>,
}

export async function saveM3U8(
  logger: Logger,
  offer: ArchiveOffer,
  bucket: Bucket,
): Promise<string> {
  logger = logger.child({ phase: 'saveM3U8' });

  const bucketBasePath = ArchiveOffer.idToHash(offer.id);

  const [ _index, file ] = await downloadAndParseM3U8(
    logger,
    offer.url,
    bucket,
    bucketBasePath,
  );

  const archiveUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
  return archiveUrl;
}

async function downloadAndParseM3U8(
  logger: Logger,
  url: string,
  bucket: Bucket,
  bucketBasePath: string,
  index: Counter = new Counter(),
  visitedSet: Set<string> = new Set(),
): Promise<[number, File]> {
  // BE WARNED: THERE ARE DRAGONS HERE
  // Not super scary dragons, but we do have some pass-by-reference shenanigans going on in
  // here. `index` is a stateful by-reference counter so we guarantee that any child M3U8
  // files--because M3U8 can have child M3U8's, which can have children of its own. We also
  // have `visitedSet` to remove cycles and to discourage rabbit-type attacks.

  const indexNumber = index.getAndIncrement();
  // TODO:  evaluate performance (if it's a problem)
  //        This is pretty iterative and await-heavy; I've tried to parallelize where
  //        I can. If we need to improve it further, there's some stuff we can try.
  const bucketFilePath = `${bucketBasePath}/${indexNumber === 0 ? 'playlist' : indexNumber}.m3u8`;

  if (visitedSet.has(url)) {
    throw new Error(`Visited set also contains '${url}'; circular reference detected.`);
  }
  visitedSet.add(url);
  
  // it's HOPEFULLY unlucky we ever hit this, but this is here in case somebody tries
  // to rabbit our app.
  if (visitedSet.size > 20) {
    logger.error(
      { visitedSet: [...visitedSet] },
      "Playlist has over 20 m3u8 files in the visited set, bailing out to be safe.",
    );
    throw new Error(`This playlist has triggered an anti-abuse mechanism.`);
  }

  const { body: m3u8Text, contentType } = await downloadFileAsText(
    logger,
    url,
  );

  const awaiters: Array<Promise<any>> = [];
  const m3u8Lines: Array<string> = [];
  for (const line of m3u8Text.split("\n")) {
    // whitespace lines and blank lines
    if (line.length === 0 || line.trim().length === 0) {
      m3u8Lines.push(line);
      continue;
    }

    // comments and directives
    // TODO:  are there directives that also require file pulls, etc. that we care about?
    //        I know there are directives such as album art, etc. but not sure of any that
    //        are relevant to our interests.
    if (line.trim().startsWith("#")) {
      m3u8Lines.push(line);
      continue;
    }

    // pretty much anything else can be a valid URL, which makes this a spicy meatball.
    // we're going to assume validity here and let it explode later if something's wrong.
    const ext = Path.extname(line);

    const mediaUrl = line.trim();

    if (ext === '.m3u8') {
      logger.debug({ mediaUrl }, "looks like an m3u8; recursively parsing to upload.");
      
      const [newIndexNumber, subM3U8] = await downloadAndParseM3U8(
        logger,
        mediaUrl,
        bucket,
        bucketBasePath,
        index,
        visitedSet,
      );

      m3u8Lines.push(`${newIndexNumber}.m3u8`);
    } else {
      const gcpArchivePath = `${bucketBasePath}/${uuidv4()}${ext}`;

      logger.debug({ mediaUrl, gcpArchivePath }, 'file detected (we think), adding to m3u8.');

      awaiters.push(archiveFile(logger, mediaUrl, bucket, gcpArchivePath));
      m3u8Lines.push(gcpArchivePath);
    }
  }

  await Promise.all(awaiters);

  logger.info("All dependent files appear to have been handled; uploading m3u8.");
  const uploadedM3U8 = await uploadTextAsFile(
    logger,
    bucket,
    bucketFilePath,
    contentType,
    m3u8Lines.join("\n"),
  );

  // `index` contains a stateful reference to the count of _this_ m3u8 file, which is useful for
  // handling child m3u8's.
  return [indexNumber, uploadedM3U8];
}

