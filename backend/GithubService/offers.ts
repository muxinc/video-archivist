import { Logger } from 'pino';

import { DataService } from '../DataService';
import { GithubWebhookPayload } from '../types';
import { VALID_DIRECTIVE_COMMANDS } from './directives';
import { findBodyContent } from './helpers';

const VIDEO_FORMAT_EXTENSIONS = [
  'webm',
  'mkv',
  'flv', 'f4v', 'f4p', 'f4a', 'f4b',
  'ogv', 'ogg',
  'avi',
  'mts', 'm2ts', 'ts',
  'wmv',
  'mp4', 'm4p', 'm4v',
  'mpg', 'mp2', 'mpeg', 'mpe', 'mpv', 'm2v',
  '3gp', '3g2',

  'm3u8',
];

export const SEARCH_PATTERN =
  new RegExp(`(?<url>https?:\/\/.*\.(?<ext>${VIDEO_FORMAT_EXTENSIONS.join('|')}))`, 'gi');

export function parseBodyForURLs(payload: GithubWebhookPayload): Set<string> {
  const body = findBodyContent(payload);
  if (!body) {
    throw new Error("No body content found in payload.");
  }

  const ret: Array<string> = [];
  const matches = body.matchAll(SEARCH_PATTERN);

  for (const match of matches) {
    ret.push(match[0]);
  }

  return new Set(ret);
}

export async function determineBehaviorForURL(logger: Logger, dataService: DataService, url: string): Promise<{}> {
  return {};
}
