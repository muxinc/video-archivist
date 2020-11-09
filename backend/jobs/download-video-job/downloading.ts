import { Bucket, File } from '@google-cloud/storage';
import Axios from 'axios';
import { Logger } from 'pino';
import sleep from 'sleep-promise';
import { Stream } from 'stream';

/**
 * Archives a target URL to a Google Cloud bucket location. Pipes through;
 * doesn't store locally.
 */
export async function archiveFile(
  logger: Logger,
  url: string,
  bucket: Bucket,
  bucketFilePath: string,
  storageUrlBase: string,
): Promise<string> {
  logger = logger.child({ phase: 'archiveFile', url, bucket: bucket.name, bucketFilePath, });

  const bucketFile = bucket.file(bucketFilePath);
  logger.info({ url, archiveUrl: bucketFile.name }, "Archiving to object storage.");
  try {
    const remoteGet = await Axios.get<Stream>(url, { responseType: 'stream' });
    if (remoteGet.status < 200 || 299 < remoteGet.status) {
      throw new Error(`Error retrieving ${url}: received status code ${remoteGet.status}.`);
    }

    const bucketStream = bucketFile.createWriteStream({
      metadata: {
        contentType: remoteGet.headers['content-type'] ?? 'video/*',
      },
      predefinedAcl: "publicRead",
    });

    const gcpOutputPipe = remoteGet.data.pipe(bucketStream, { end: true });

    const archiveUrl = `${storageUrlBase}/${bucket.name}/${bucketFile.name}`;
    logger.info({ archiveUrl }, "File archived to object storage.");
    return archiveUrl;
  } catch (err) {
    logger.warn({ err }, "Error caught in archiveFile; removing bucket file if it has been created.");

    if (await bucketFile.exists()) {
      await bucketFile.delete();
    }

    throw err;
  }
}

export async function downloadFileAsText(
  logger: Logger,
  url: string,
): Promise<{ body: string, contentType: string }> {
  logger = logger.child({ phase: 'archiveFile', url });
  logger.info("Downloading file locally.");

  const remoteGet = await Axios.get<string>(url, { responseType: 'text' });
  if (remoteGet.status < 200 || 299 < remoteGet.status) {
    throw new Error(`Error retrieving ${url}: received status code ${remoteGet.status}.`);
  }

  return {
    body: remoteGet.data,
    contentType: remoteGet.headers['content-type'] ?? 'application/octet-stream',
  };
}

export async function uploadTextAsFile(
  logger: Logger,
  bucket: Bucket,
  bucketFilePath: string,
  contentType: string,
  text: string,
): Promise<File> {
  logger = logger.child({ phase: 'uploadTextAsFile', bucket: bucket.name, bucketFilePath, });

  const bucketFile = bucket.file(bucketFilePath);
  logger.info({ archiveUrl: bucketFile.name }, "Archiving to object storage.");
  try {
    const bucketStream = bucketFile.createWriteStream({
      metadata: {
        contentType: contentType,
      },
      predefinedAcl: "publicRead",
    });

    bucketStream.write(text, 'utf-8');
    bucketStream.end();

    return bucketFile;
  } catch (err) {
    logger.warn({ err }, "Error caught in uploadTextAsFile; removing bucket file if it has been created.");

    if (await bucketFile.exists()) {
      await bucketFile.delete();
    }

    throw err;
  }
}
