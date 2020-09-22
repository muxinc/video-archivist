import * as Crypto from 'crypto';

// these hmac methods do some unnecessary copying. they shame me but this isn't gonna
// get crazy traffic so we don't have to do, like, buffer reuse and stuff.
function createGithubHmac(secret: string, plaintext: Buffer): Buffer {
  const hmac = Crypto.createHmac('sha1', secret);
  hmac.setEncoding('hex')
  hmac.write(plaintext)
  hmac.end();
  return Buffer.from(`sha1=${hmac.read()}`, 'utf-8');
}

export function checkGithubHmac(secret: string, plaintext: Buffer, existingHmac: string): boolean {
  const hmacBuffer = createGithubHmac(secret, plaintext);
  const existingBuffer = Buffer.from(existingHmac, 'utf-8');

  return Crypto.timingSafeEqual(hmacBuffer, existingBuffer);
}
