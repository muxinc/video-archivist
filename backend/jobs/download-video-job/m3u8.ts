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

type ExtTagKV = [string, string | undefined];
type ParsedExtTags = { tagName: string, kvs: Array<ExtTagKV> };

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
  m3u8Url: string,
  bucket: Bucket,
  bucketBasePath: string,
  index: Counter = new Counter(),
  visitedSet: Set<string> = new Set(),
): Promise<[number, File]> {
  logger = logger.child({ m3u8Url });
  
  // BE WARNED: THERE ARE DRAGONS HERE
  // Not super scary dragons, but we do have some pass-by-reference shenanigans going on in
  // here. `index` is a stateful by-reference counter so we guarantee that any child M3U8
  // files--because M3U8 can have child M3U8's, which can have children of its own. We also
  // have `visitedSet` to remove cycles and to discourage rabbit-type attacks.

  const indexNumber = index.getAndIncrement();
  const paddedIndex = indexNumber.toString().padStart(4, '0');
  // TODO:  evaluate performance (if it's a problem)
  //        This is pretty iterative and await-heavy; I've tried to parallelize where
  //        I can. If we need to improve it further, there's some stuff we can try.
  const bucketFilePath = `${bucketBasePath}/${indexNumber === 0 ? 'playlist' : indexNumber}.m3u8`;

  if (visitedSet.has(m3u8Url)) {
    throw new Error(`Visited set also contains '${m3u8Url}'; circular reference detected.`);
  }
  visitedSet.add(m3u8Url);
  
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
    m3u8Url,
  );

  const awaiters: Array<Promise<any>> = [];
  const m3u8Lines: Array<string> = [];
  for (const line of m3u8Text.split("\n")) {
    // whitespace lines and blank lines
    if (line.length === 0 ||
        line.trim().length === 0 ||
        line === '#EXTM3U' ||
        line.startsWith("#EXTINF")) {
      m3u8Lines.push(line);
      continue;
    }

    const trimmedLine = line.trim();

    // comments and directives
    // TODO:  are there directives that also require file pulls, etc. that we care about?
    //        I know there are directives such as album art, etc. but not sure of any that
    //        are relevant to our interests.
    if (trimmedLine.startsWith("#")) {
      // There are only a few tags that contain URIs that we really care about:
      // EXT-X-KEY, EXT-X-MEDIA, and EXT-X-SESSION-DATA. But three are enough that writing
      // special case code isn't great, and we may add more in the future. As such we're
      // going to Actually Parse EXT tags, find ones with URI components, fix those up, and
      // inject them.

      const extTags = parseExtTags(line);

      const fixedKvs: Array<ExtTagKV> = [];
      for (const [k, v] of extTags.kvs) {
        // EXT tags don't allow lower-case but at the same time we probably don't want
        // to accidentally munge intentionally-hosed files if we can avoid it.
        //
        // There are no great heuristics for "this looks like a URI", but all standard
        // URIs seem to be called `URI`, so we'll go with it.
        if (k.toUpperCase() === "URI" && v?.startsWith('"') && v?.endsWith('"')) {
          if (!v) {
            throw new Error(`URI in m3u8 ext tag '${line}' but no field. Can't meaningfully recover.`);
          }

          const dequoted = v.slice(1, -1);
          const mediaUrl = canonicalizeUrl(m3u8Url, dequoted);

          const archivedLocation = await handleFileWithinM3U8(
            logger,
            mediaUrl,
            bucket,
            bucketBasePath,
            index,
            visitedSet,
            awaiters,
            `${paddedIndex}-EXT-${k}-`
          );

          fixedKvs.push([k, `"${archivedLocation}"`]);
        } else {
          fixedKvs.push([k, v]);
        }
      }

      m3u8Lines.push(extTagsToM3U8Format({ tagName: extTags.tagName, kvs: fixedKvs }));
      continue;
    }

    // pretty much anything else can be a valid URL, which makes this a spicy meatball.
    // we're going to assume validity here and let it explode later if something's wrong.
    const mediaUrl = canonicalizeUrl(m3u8Url, trimmedLine);

    m3u8Lines.push(
      await handleFileWithinM3U8(
        logger,
        mediaUrl,
        bucket,
        bucketBasePath,
        index,
        visitedSet,
        awaiters,
        `${paddedIndex}-FILE-`,
      ),
    );
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

export function parseExtTags(line: string): ParsedExtTags {
  // this regex is, roughly speaking, "split on commas but not in quotes"
  const [tagName, allTags] = line.substring(1).split(':', 2);
  if (!tagName) {
    throw new Error(`Parsing line '${line}' - no tag found`);
  }
  const kvs: Array<[string, string | undefined]> = [];

  if (allTags) {
    // this hefty chonk is "split on commas, but not if it's quoted". It doesn't support
    // slash-escaped quotes inside the string but that's fine, any of those would be
    // URL encoded here anyway (and the regex would possibly actually shoot back).
    const tokens = allTags.split(/,+(?=(?:(?:[^"]*"){2})*[^"]*$)/g);

    // So this is a weird one and I don't have a great way to handle it; the
    // RFC includes strings for user input but non-strings (bare words) for
    // enumerated values, like `EXT-X-KEY:METHOD=AES-128:KEY="somekey.file"`.
    // As such the user of this is just gonna have to remember, if they're
    // messing with user input like `URI=` attributes, to add strings themselves.
    // I do this as a for loop so I can throw.
    for (const token of tokens) {
      const [k, v] = token.split('=', 2);
      if (!k) {
        throw new Error(`Parsing line '${line}' - no key found in token.`);
      }

      kvs.push([k, v]);
    }
  }

  return { tagName, kvs };
}

export function extTagsToM3U8Format(tags: ParsedExtTags) {
  let str = "#";
  str = str + tags.tagName;

  if (tags.kvs.length > 0) {
    str = str + ":";
    str = str + tags.kvs.map(kv => (kv[1] ? [kv[0], kv[1]] : [kv[0]]).join('=')).join(',');
  }

  return str;
}

function canonicalizeUrl(m3u8Url: string, mediaUrl: string): string {
  if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) {
    return mediaUrl;
  }

  return Path.dirname(m3u8Url) + "/" + mediaUrl;
}

async function handleFileWithinM3U8(
  logger: Logger,
  referredUrl: string,
  bucket: Bucket,
  bucketBasePath: string,
  index: Counter,
  visitedSet: Set<string>,
  awaiters: Array<Promise<any>>,
  filePrefix: string,
) {
  const ext = Path.extname(referredUrl);

  if (ext === '.m3u8') {
    logger.debug({ referredUrl }, "looks like an m3u8; recursively parsing to upload.");
    
    const [newIndexNumber, subM3U8] = await downloadAndParseM3U8(
      logger,
      referredUrl,
      bucket,
      bucketBasePath,
      index,
      visitedSet,
    );

    return `${newIndexNumber}.m3u8`;
  } else {
    const archiveFileName = `${filePrefix}${uuidv4()}${ext}`;
    const gcpArchivePath = `${bucketBasePath}/${archiveFileName}`;

    logger.debug({ referredUrl, gcpArchivePath }, 'file detected (we think), adding to m3u8.');

    awaiters.push(archiveFile(logger, referredUrl, bucket, gcpArchivePath));
    return archiveFileName;
  }
}
