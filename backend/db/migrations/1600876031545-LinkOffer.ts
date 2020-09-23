import {MigrationInterface, QueryRunner} from "typeorm";

export class LinkOffer1600876031545 implements MigrationInterface {
    name = 'LinkOffer1600876031545'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "link_offer" ("id" SERIAL NOT NULL, "issue_number" integer NOT NULL, "processed" boolean NOT NULL DEFAULT false, "repo_id" uuid NOT NULL, "video_id" uuid NOT NULL, CONSTRAINT "PK_52d4d4fee8b3b3355f9b00153e4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "link_offer" ADD CONSTRAINT "FK_ee6a2ba86a172ea88e3fb22f897" FOREIGN KEY ("repo_id") REFERENCES "repo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "link_offer" ADD CONSTRAINT "FK_25ab5e2242d1011b3afa36c24fb" FOREIGN KEY ("video_id") REFERENCES "video"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "link_offer" DROP CONSTRAINT "FK_25ab5e2242d1011b3afa36c24fb"`);
        await queryRunner.query(`ALTER TABLE "link_offer" DROP CONSTRAINT "FK_ee6a2ba86a172ea88e3fb22f897"`);
        await queryRunner.query(`DROP TABLE "link_offer"`);
    }

}
