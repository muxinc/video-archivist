import * as Crypto from 'crypto';

import { Logger } from 'pino';
import { DataService } from './DataService';
import { GithubWebhookPayloads } from './types';

export const GITHUB_WEBHOOK_SIGNATURE_HEADER = 'x-hub-signature';

// these hmac methods do some unnecessary copying. they shame me but this isn't gonna
// get crazy traffic so we don't have to do, like, buffer reuse and stuff.
function createGithubHmac(secret: string, plaintext: Buffer): Buffer {
  const hmac = Crypto.createHmac('sha1', secret);
  hmac.setEncoding('hex')
  hmac.write(plaintext)
  hmac.end();
  return Buffer.from(`sha1=${hmac.read()}`, 'utf-8');
}

function checkGithubHmac(secret: string, plaintext: Buffer, existingHmac: string): boolean {
  const hmacBuffer = createGithubHmac(secret, plaintext);
  const existingBuffer = Buffer.from(existingHmac, 'utf-8');

  return Crypto.timingSafeEqual(hmacBuffer, existingBuffer);
}

export async function verifyWebhookPayloadAgainstRepos(
  logger: Logger,
  dataService: DataService,
  payload: GithubWebhookPayloads,
  payloadBuffer: Buffer,
  githubSignature: string,
): Promise<boolean> {
  const [orgName, repoName] = payload.repository.full_name.split('/', 2);
  
  if (!orgName || !repoName) {
    throw new Error("Badly formatted repo fullname.");
  }

  const repo = await dataService.getRepo(orgName, repoName);
  if (!repo) {
    logger.warn({ orgName, repoName }, "Repo not found in system, but webhook received.");
    return false;
  }

  const result = checkGithubHmac(repo.webhookSecret, payloadBuffer, githubSignature);
  if (!result) {
    logger.warn({ orgName, repoName}, "Invalid HMAC found for the requested repo.");
  }

  return result;
}
