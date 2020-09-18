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
}
