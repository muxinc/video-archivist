import {Column, CreateDateColumn, Entity, Index, JoinTable, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn} from "typeorm";

import { Video } from './Video.entity';

@Entity()
@Index(['organizationName', 'repositoryName'], { unique: true })
export class Repo {
  @PrimaryGeneratedColumn('uuid')
  readonly id!: string;

  @Column()
  organizationName!: string;

  @Column()
  repositoryName!: string;

  @CreateDateColumn()
  readonly createdAt!: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt!: Date | null;

  @ManyToMany(type => Video)
  @JoinTable({
    name: 'repo_videos',
    joinColumn: {
      name: 'video',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'repo',
      referencedColumnName: 'id',
    },
  })
  videos!: Array<Video> | null; 
}
