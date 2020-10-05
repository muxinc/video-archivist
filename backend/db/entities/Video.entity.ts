import Joi from 'joi';
import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Repo } from './Repo.entity';

@Entity()
export class Video {
  @PrimaryGeneratedColumn('uuid')
  readonly id!: string;

  @Column({ unique: true })
  originalUrl!: string;

  @Column()
  acquiredFrom!: string;

  @Column()
  archiveUrl!: string;

  @CreateDateColumn()
  readonly createdAt!: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt!: Date | null;

  @ManyToMany(type => Repo)
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
  repos!: Array<Repo> | null;

  static VideoDTO = Joi.object({
    id: Joi.string(),
    originalFilename: Joi.string(),
    acquiredFrom: Joi.string(),
    url: Joi.string(),
    createdAt: Joi.date(),
  }).options({ presence: 'required' }).label('VideoDTO');
}
