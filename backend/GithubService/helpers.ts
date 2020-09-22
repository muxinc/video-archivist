import { ARCHIVE_OFFER_ID_ALPHABET } from '../db/entities/ArchiveOffer.entity';
import { GithubWebhookPayload, isGithubComment, isGithubIssue } from '../types';

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
  new RegExp(`(?<url>https?:\/\/.*\.(?<ext>${VIDEO_FORMAT_EXTENSIONS.join('|')}))`, 'i');

export type Directive = {
  command: string,
  id: number,
};


export function findBodyContent(payload: GithubWebhookPayload): string | null {
  if (isGithubIssue(payload)) {
    return payload.issue.body;
  } else if (isGithubComment(payload)) {
    return payload.comment.body;
  }

  return null;
}

export function isActionableWebhook(payload: GithubWebhookPayload): boolean {
  return (
    (isGithubIssue(payload) && payload.action === 'opened') ||
    (isGithubComment(payload) && payload.action === 'created')
  );
}

export function isByIgnoredUser(payload: GithubWebhookPayload, ignoredUsers: ReadonlySet<String>): boolean {
  const user = payload.sender;
  return !!user && ignoredUsers.has(user.login.toLowerCase());
}
