import Joi from 'joi';
import {Column, CreateDateColumn, Entity, Index, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn} from "typeorm";
import { ArchiveOffer } from './ArchiveOffer.entity';

import { Video } from './Video.entity';

@Entity()
@Index(['organizationName', 'repositoryName'], { unique: true })
export class Repo {
  @PrimaryGeneratedColumn('uuid')
  readonly id!: string;

  @Column({ nullable: false })
  organizationName!: string;

  @Column({ nullable: false })
  repositoryName!: string;

  @CreateDateColumn({ nullable: false })
  readonly createdAt!: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt!: Date | null;

  @Column({ nullable: false })
  webhookSecret!: string;

  @ManyToMany(type => Video, v => v.repos, { cascade: true })
  @JoinTable({
    name: 'repo_videos',
    joinColumn: {
      name: 'repo',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'video',
      referencedColumnName: 'id',
    },
  })
  videos!: Array<Video> | null;

  @OneToMany(type => ArchiveOffer, ao => ao.repo)
  archiveOffers!: Array<ArchiveOffer> | null;

  static RepoDTO = Joi.object({
    organizationName: Joi.string(),
    repositoryName: Joi.string(),
  }).options({ presence: 'required' }).label('RepoDTO');
}
