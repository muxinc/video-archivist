import { GithubWebhookPayload, isGithubComment, isGithubIssue } from '../types';

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
