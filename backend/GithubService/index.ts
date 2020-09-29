import Hapi from '@hapi/hapi';
import { Octokit } from '@octokit/rest';
import IORedis from 'ioredis';
import { Logger } from 'pino';

import { checkGithubHmac } from '../crypto-utils';
import { DataService } from '../DataService';
import { Repo } from '../db/entities/Repo.entity';
import { Queues } from '../jobs/queues';
import { GithubWebhookPayload } from '../types';
import { filterDirectives, findDirectives, makeDirectiveRegexp } from './directives';
import { isActionableWebhook, isByIgnoredUser } from './helpers';
import { determineBehaviorForURLs, makeOffers, parseBodyForURLs, sendOfferComment } from './offers';

export const GITHUB_WEBHOOK_SIGNATURE_HEADER = 'x-hub-signature';

declare module '@hapi/hapi' {
  interface Request {
    getGithubService: () => GithubService;
  }

  interface PluginProperties {
    'github-service': {
      getGithubService: () => GithubService;
    }
  }
}

export type GithubServiceConfig = {
  readonly accessToken: string;

  readonly redisOptions: IORedis.RedisOptions;
}

export class GithubService {
  private readonly ignoredUsers: ReadonlySet<string>;
  private readonly directiveRegexp: RegExp;

  /**
   * 
   * @param logger logger for...loggering
   * @param dataService data service for DAL access
   * @param octokit GitHub API, preconfigured with auth
   * @param ignoredUsers list of users (should include the octokit user) who will not trigger webhook responses
   */
  constructor(
    private readonly logger: Logger,
    private readonly dataService: DataService,
    private readonly octokit: Octokit,
    private readonly botUsername: string,
    private readonly queues: Queues,
    ignoredUsers: ReadonlyArray<string>,
  ) {
    this.ignoredUsers = new Set([botUsername, ...ignoredUsers].map(u => u.toLowerCase()));
    this.directiveRegexp = makeDirectiveRegexp(botUsername);
  }

  async getRepoFromPayload(payload: GithubWebhookPayload): Promise<Repo | null> {
    const [orgName, repoName] = payload.repository.full_name.split('/', 2);
    
    if (!orgName || !repoName) {
      throw new Error("Badly formatted repo fullname.");
    }

    const repo = await this.dataService.getRepo(orgName, repoName);
    if (!repo) {
      this.logger.warn({ orgName, repoName }, "Repo not found in system, but webhook received.");
      return null;
    }

    return repo;
  }

  async verifyWebhookPayloadAgainstRepos(
    payload: GithubWebhookPayload,
    payloadBuffer: Buffer,
    githubSignature: string,
  ): Promise<boolean> {
    const repo = await this.getRepoFromPayload(payload);
    if (!repo) {
      return false;
    }
    const logger = this.logger.child({ orgName: repo.organizationName, repoName: repo.repositoryName });
  
    const result = checkGithubHmac(repo.webhookSecret, payloadBuffer, githubSignature);
    if (!result) {
      logger.warn("Invalid HMAC found for the requested repo.");
    } else {
      logger.debug("Webhook validated.");
    }
  
    return result;
  }

  async processGithubWebhook(
    payload: GithubWebhookPayload,
  ) {
    const repo = await this.getRepoFromPayload(payload);
    if (!repo) {
      throw new Error('Repo not configured for webhooks.');
    }
    
    const logger = this.logger.child({
      orgName: repo.organizationName,
      repoName: repo.repositoryName,
      webhook: {
        action: payload.action,
        sender: payload.sender.login,
      },
    });

    logger.debug("Beginning to handle webhook.");

    // we could get ourselves into trouble if we don't filter ourselves out of
    // the webhooks that we handle, and this can also be useful for anti-abuse
    // in the future if need be.
    if (isByIgnoredUser(payload, this.ignoredUsers)) {
      logger.debug("Ignored user; skipping processing.");
      return;
    }

    if (!isActionableWebhook(payload)) {
      logger.debug("Not an actionable webhook; skipping processing.");
      return;
    }

    logger.debug("Actionable webhook detected; beginning processing.");

    await this.handleDirectives(logger, payload, repo);
    await this.handleOffers(logger, payload, repo);
  }

  private async handleDirectives(logger: Logger, payload: GithubWebhookPayload, repo: Repo): Promise<void> {
    // note: this calls out to methods in `directives.ts` just to keep this file tidy.
    logger = logger.child({ phase: 'handleDirectives' });
    
    // we need to locate any directives of the form "@bot save xyzabc" in a new comment...
    const foundDirectives = findDirectives(this.directiveRegexp, payload);
    logger.debug({ foundDirectiveCount: foundDirectives.length }, `${foundDirectives.length} directives found.`);
    // now that we've found them, let's sanity check them...

    const directives = await filterDirectives(logger, this.dataService, foundDirectives, payload.issue.number, repo);
    logger.debug({ directiveCount: directives.length }, `${directives.length} directives after filtering.`);

    if (directives.length < 1) {
      logger.debug("No directives found, ending.");
      return;
    }

    // TODO:  now that we have directives, do something useful with them!
    //        - `@botname save <OFFER_HASHID>` should download an existing video or playlist and make a Video
    //        - `@botname link <LINK_HASHID>` should add a many-to-many link between an existing video and this repo

    for (const directive of directives) {
      switch (directive.command) {
        case 'link':
          throw new Error("TODO: implement linking");
        case 'save':
          logger.info({ archiveOfferId: directive.id }, "Enqueueing job for archive offer.");
          this.queues.enqueueDownloadVideoJob({ archiveOfferId: directive.id });
          break;
        default:
          throw new Error("Impossible directive: " + JSON.stringify(directive));
      }
    }
  }

  private async handleOffers(logger: Logger, payload: GithubWebhookPayload, repo: Repo): Promise<void> {
    logger = logger.child({ phase: 'handleOffers' });

    // parse the payload for URLs
    const urls = parseBodyForURLs(payload);
    if (urls.size < 1) {
      logger.debug("No URLs found, ending.");
      return;
    }

    logger.info({ urls }, "URLs detected; processing them now.");

    // determine proper behavior with those URLs
    const behaviors = await determineBehaviorForURLs(logger, this.dataService, urls);
    const offers = await makeOffers(logger, this.dataService, behaviors, repo, payload.issue.number);
    logger.info({ offerCount: offers.length }, `${offers.length} offers created.`);

    // now, post a comment to the issue thread
    const issueNumber = payload.issue.number;
    logger.debug({ issueNumber }, "sending comment with offers.");
    await sendOfferComment(this.botUsername, offers, repo, issueNumber, this.octokit);
    logger.info({ issueNumber }, "github comment sent");
  }




  public static readonly hapiPlugin: Hapi.Plugin<GithubServiceConfig> = {
    name: 'github-service',
    dependencies: ['hapi-pino', 'data-service'],
    register: async (server: Hapi.Server, options: GithubServiceConfig) => {
      const octokit = new Octokit({
        auth: options.accessToken,
        userAgent: 'playbackproblems.mux.dev',
      });

      // crash early and often if the token isn't valid
      const whoami = (await octokit.users.getAuthenticated()).data;

      const getGithubService = () => {
        return new GithubService(
          server.logger,
          server.plugins['data-service'].getDataService(),
          octokit,
          whoami.login,
          new Queues(server.logger, options.redisOptions),
          [],
        );
      };
  
      server.expose('getGithubService', getGithubService);
      server.decorate('request', 'getGithubService', getGithubService);
    },
  };
}
