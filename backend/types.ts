import { EventPayloads } from '@octokit/webhooks';

export type GithubWebhookPayloads =
  | EventPayloads.WebhookPayloadIssueComment
  | EventPayloads.WebhookPayloadIssues;
