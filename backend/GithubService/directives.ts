import { Logger } from 'pino';
import { DataService } from '../DataService';
import { ArchiveOffer, ARCHIVE_OFFER_ID_ALPHABET } from '../db/entities/ArchiveOffer.entity';
import { Repo } from '../db/entities/Repo.entity';
import { GithubWebhookPayload, Offer, OfferBehavior } from '../types';
import { Directive, findBodyContent } from './helpers';

export type DirectiveToOfferFactory = (data: DataService, d: Directive) => Promise<Offer | undefined>;

export const VALID_DIRECTIVE_COMMANDS: Record<string, DirectiveToOfferFactory> = {
  'save': async (data, d) => data.getArchiveOffer(d.id),
  'link': async (data, d) => data.getLinkOffer(d.id),
};

export function makeDirectiveRegexp(botUsername: string): RegExp {
  return new RegExp(`@${botUsername} (?<command>(${Object.keys(VALID_DIRECTIVE_COMMANDS).join('|')})) (?<hashid>[${ARCHIVE_OFFER_ID_ALPHABET}]+)`, 'gi')
}

export function findDirectives(
  regexp: RegExp,
  payload: GithubWebhookPayload,
): Array<Directive> {
  const body = findBodyContent(payload);
  if (!body) {
    throw new Error("Tried to find directives in a payload that can't possibly have them.");
  }

  const ret: Array<Directive> = [];
  const matches = body.matchAll(regexp);
  for (const match of matches) {
    const command = (match.groups ?? {})['command'] || 'UNDEFINED';
    const hashid = (match.groups ?? {})['hashid'] || '!!!!';
    ret.push({ command, id: ArchiveOffer.hashToId(hashid) as number });
  }

  return ret;
}

/**
 * We only want directives that match ArchiveOffers that have been made for _this_ issue.
 */
export async function filterDirectives(
  logger: Logger,
  dataService: DataService,
  directives: ReadonlyArray<Directive>,
  issueNumber: number,
  repo: Repo,
): Promise<Array<Directive>> {
  const ret: Array<Directive> = [];

  const entries = await Promise.all(directives.map(async (d): Promise<[Directive, Offer | undefined]> => {
    const factory = VALID_DIRECTIVE_COMMANDS[d.command];
    if (factory) {
      return [d, await factory(dataService, d)];
    }

    return [d, undefined];
  }));

  for (const [directive, offer] of entries) {
    logger = logger.child({ directive });
    if (!offer) {
      logger.debug("No offer for directive.");
      continue;
    }
    if (offer.processed) {
      logger.debug("Offer already processed.");
      continue;
    }

    // the first clause should never happen because we join on it, but to be explicit
    if (!(offer.repo) || offer.repo.id !== repo.id) {
      logger.warn(`No repo in offer join OR offer repo id ${offer.repo?.id ?? 'NONE FOUND'} != passed repo ${repo.id}`);
      continue;
    }

    if (offer.issueNumber !== issueNumber) {
      logger.debug(`Offer issue number ${offer.issueNumber} does not match directive number ${issueNumber}`);
      continue;
    }

    ret.push(directive);
  }

  return ret;
}
