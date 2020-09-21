import Joi from 'joi';
import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Repo } from './Repo.entity';

@Entity()
export class Video {
  @PrimaryGeneratedColumn('uuid')
  readonly id!: string;

  @Column()
  originalFilename!: string;

  @Column()
  acquiredFrom!: string;

  @Column()
  url!: string;

  @CreateDateColumn()
  readonly createdAt!: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt!: Date | null;

  @ManyToMany(type => Repo)
  @JoinTable({
    name: 'repo_videos',
    inverseJoinColumn: {
      name: 'video',
      referencedColumnName: 'id',
    },
    joinColumn: {
      name: 'repo',
      referencedColumnName: 'id',
    },
  })
  repos!: Array<Repo> | null;

  static VideoDTO = Joi.object({
    id: Joi.string(),
    originalFilename: Joi.string(),
    acquiredFrom: Joi.string(),
    url: Joi.string(),
    createdAt: Joi.date(),
  }).options({ presence: 'required' }).label('VideoDTO');
}
