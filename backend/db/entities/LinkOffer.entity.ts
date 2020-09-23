import Hashids from 'hashids/cjs';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Offer, OfferBehavior } from '../../types';
import { ARCHIVE_OFFER_ID_ALPHABET } from './ArchiveOffer.entity';
import { Repo } from './Repo.entity';
import { Video } from './Video.entity';

const LINK_OFFER_HASHIDS = new Hashids('link offer', 6, ARCHIVE_OFFER_ID_ALPHABET);

/**
 * When we detect a video link in a monitored repository that we already track as
 * a `Video`, we offer to link the existing video to the monitored repository.
 */
@Entity()
export class LinkOffer {
  readonly type: OfferBehavior = 'link';

  @PrimaryGeneratedColumn()
  readonly id!: number;

  @ManyToOne(type => Repo, r => r.linkOffers, { nullable: false })
  repo!: Repo | null;

  @ManyToOne(type => Video, v => v.linkOffers, { nullable: false })
  video!: Video | null;

  @Column({ nullable: false })
  readonly issueNumber!: number;

  @Column({ nullable: false, default: false })
  processed!: boolean;

  static idToHash(id: number) {
    return LINK_OFFER_HASHIDS.encode([id]);
  }

  static hashToId(hash: string) {
    return LINK_OFFER_HASHIDS.decode(hash)[0] || 0;
  }

  static isLinkOffer(offer: Offer): offer is LinkOffer {
    return offer.type === 'link';
  }
}
