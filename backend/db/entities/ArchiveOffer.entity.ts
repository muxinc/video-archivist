import Hashids from 'hashids/cjs';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Repo } from './Repo.entity';

export const ARCHIVE_OFFER_ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
const ARCHIVE_OFFER_HASHIDS = new Hashids('archive offer hashid', 6, ARCHIVE_OFFER_ID_ALPHABET);

/**
 * When we detect a video link in a monitored repository, we spawn an archive offer
 * so that we can track a request to archive.
 */
@Entity()
export class ArchiveOffer {
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @ManyToOne(type => Repo, r => r.archiveOffers, { nullable: false })
  repo!: Repo | null;

  @Column({ nullable: false })
  readonly issueNumber!: number;

  @Column({ nullable: false })
  readonly url!: string;

  @Column({ nullable: false, default: false })
  processed!: boolean;

  static idToHash(id: number) {
    return ARCHIVE_OFFER_HASHIDS.encode([id]);
  }

  static hashToId(hash: string) {
    return ARCHIVE_OFFER_HASHIDS.decode(hash)[0] || 0;
  }
}
