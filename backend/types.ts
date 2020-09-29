import { EventPayloads } from '@octokit/webhooks';

import { ArchiveOffer } from './db/entities/ArchiveOffer.entity';

export type Offer =
  | ArchiveOffer
  ;

export type OfferBehavior = 'save' | 'link';

export type GithubWebhookPayload =
  | EventPayloads.WebhookPayloadIssueComment
  | EventPayloads.WebhookPayloadIssues;


export function isGithubIssue(payload: GithubWebhookPayload): payload is EventPayloads.WebhookPayloadIssues {
  return 'issue' in payload && !('comment' in payload);
}

export function isGithubComment(payload: GithubWebhookPayload): payload is EventPayloads.WebhookPayloadIssueComment {
  return 'issue' in payload && 'comment' in payload;
}
