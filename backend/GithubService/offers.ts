import { Octokit } from '@octokit/rest';
import { Logger } from 'pino';

import { DataService } from '../DataService';
import { ArchiveOffer } from '../db/entities/ArchiveOffer.entity';
import { Repo } from '../db/entities/Repo.entity';
import { GithubWebhookPayload, Offer, OfferBehavior } from '../types';
import { sendGithubComment } from './commenting';
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

const OFFER_COMMENT_HEADER =
  `Hey! We've detected some video files in a comment on this issue. If you'd like to permanently ` +
  `archive these videos and tie them to this project, a maintainer of the project can reply ` +
  `to this issue with the following commands:`;

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

export async function determineBehaviorForURLs(
  logger: Logger,
  dataService: DataService,
  urls: ReadonlySet<string>,
): Promise<Record<string, OfferBehavior | null>> {
  // TODO:  this may emit null so we can filter things (ex. don't offer to link things in our own buckets)
  // TODO:  also check for 404 here so we don't try to archive something bogus? or do that on save?

  // this is set up in the way it is (with multiple commands etc.) because
  // there used to be a separate `link` command rather than just `save`. I
  // could've refactored it all out, but I left it as it's not harmful code
  // and may end up useful later.
  return Object.fromEntries(
    await Promise.all(
      [...urls].map(async url => [url, 'save']),
    ),
  );
}

export type OfferWithTag = { save: ArchiveOffer };

export async function makeOffers(
  logger: Logger,
  dataService: DataService,
  actions: Record<string, OfferBehavior | null>,
  repo: Repo,
  issueNumber: number,
): Promise<Array<OfferWithTag>> {
  return Promise.all(
    Object.entries(actions).map(async ([url, action]) => {
      switch (action) {
        case 'save':
          return { save: await dataService.createArchiveOffer({
            issueNumber,
            repo,
            url,
          }) };
        default:
          throw new Error("can't happen!");
      }
    }),
  );
}

function templateOfferCommentBody(
  botUsername: string,
  offerWithTags: ReadonlyArray<OfferWithTag>,
): string {
  const offerBullets =
    offerWithTags.map(oft => {
      if ('save' in oft) {
        return `- for ${oft.save.url}: say \`@${botUsername} save ${ArchiveOffer.idToHash(oft.save.id)}\``;
      } else {
        throw new Error("unrecognized offer in templating: " + JSON.stringify(oft));
      }
    });

  return `${OFFER_COMMENT_HEADER}\n\n${offerBullets.join("\n")}`;
}

export async function sendOfferComment(
  botUsername: string,
  offers: ReadonlyArray<OfferWithTag>,
  repo: Repo,
  issueNumber: number,
  octokit: Octokit,
) {
  if (offers.length < 1) {
    throw new Error("No offers were to be sent.");
  }

  const body = templateOfferCommentBody(botUsername, offers);
  return sendGithubComment(octokit, repo, issueNumber, body);
}
