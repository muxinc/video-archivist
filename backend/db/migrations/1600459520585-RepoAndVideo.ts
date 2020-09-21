import {MigrationInterface, QueryRunner} from "typeorm";

export class RepoAndVideo1600459520585 implements MigrationInterface {
    name = 'RepoAndVideo1600459520585'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "video" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "original_filename" character varying NOT NULL, "acquired_from" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP DEFAULT now(), CONSTRAINT "PK_1a2f3856250765d72e7e1636c8e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "repo" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_name" character varying NOT NULL, "repository_name" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP DEFAULT now(), CONSTRAINT "PK_6c3318a15f9a297481f341128cf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_daea50335f0cb5e54856d7e2ba" ON "repo" ("organization_name", "repository_name") `);
        await queryRunner.query(`CREATE TABLE "repo_videos" ("repo" uuid NOT NULL, "video" uuid NOT NULL, CONSTRAINT "PK_3a61042c5fa9de88f767187eb89" PRIMARY KEY ("repo", "video"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c58c81fc8cb844439a4e5b82c3" ON "repo_videos" ("repo") `);
        await queryRunner.query(`CREATE INDEX "IDX_46ad2973f2ef066d8d0b30c459" ON "repo_videos" ("video") `);
        await queryRunner.query(`ALTER TABLE "repo_videos" ADD CONSTRAINT "FK_c58c81fc8cb844439a4e5b82c38" FOREIGN KEY ("repo") REFERENCES "video"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "repo_videos" ADD CONSTRAINT "FK_46ad2973f2ef066d8d0b30c4597" FOREIGN KEY ("video") REFERENCES "repo"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repo_videos" DROP CONSTRAINT "FK_46ad2973f2ef066d8d0b30c4597"`);
        await queryRunner.query(`ALTER TABLE "repo_videos" DROP CONSTRAINT "FK_c58c81fc8cb844439a4e5b82c38"`);
        await queryRunner.query(`DROP INDEX "IDX_46ad2973f2ef066d8d0b30c459"`);
        await queryRunner.query(`DROP INDEX "IDX_c58c81fc8cb844439a4e5b82c3"`);
        await queryRunner.query(`DROP TABLE "repo_videos"`);
        await queryRunner.query(`DROP INDEX "IDX_daea50335f0cb5e54856d7e2ba"`);
        await queryRunner.query(`DROP TABLE "repo"`);
        await queryRunner.query(`DROP TABLE "video"`);
    }

}
