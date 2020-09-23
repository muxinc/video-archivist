import { Octokit } from '@octokit/rest';
import { Repo } from '../db/entities/Repo.entity';

export function sendGithubComment(
  octokit: Octokit,
  repo: Repo,
  issueNumber: number,
  body: string,
) {
  return octokit.issues.createComment({
    body,
    owner: repo.organizationName,
    repo: repo.repositoryName,
    issue_number: issueNumber,
  });
}
