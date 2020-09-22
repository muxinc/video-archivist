import { EventPayloads } from '@octokit/webhooks';

export type GithubWebhookPayload =
  | EventPayloads.WebhookPayloadIssueComment
  | EventPayloads.WebhookPayloadIssues;


export function isGithubIssue(payload: GithubWebhookPayload): payload is EventPayloads.WebhookPayloadIssues {
  return 'issue' in payload && !('comment' in payload);
}

export function isGithubComment(payload: GithubWebhookPayload): payload is EventPayloads.WebhookPayloadIssueComment {
  return 'issue' in payload && 'comment' in payload;
}
