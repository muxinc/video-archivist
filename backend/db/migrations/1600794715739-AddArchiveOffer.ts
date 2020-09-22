import {MigrationInterface, QueryRunner} from "typeorm";

export class AddArchiveOffer1600794715739 implements MigrationInterface {
    name = 'AddArchiveOffer1600794715739'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "archive_offer" ("id" SERIAL NOT NULL, "issue_number" integer NOT NULL, "url" character varying NOT NULL, "repo_id" uuid, CONSTRAINT "PK_b49f4a3b4f250733b2662fff41e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "archive_offer" DROP COLUMN "issue_number"`);
        await queryRunner.query(`ALTER TABLE "archive_offer" ADD "issue_number" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "archive_offer" ADD CONSTRAINT "FK_cc0db48ab806ac28fd31556d7eb" FOREIGN KEY ("repo_id") REFERENCES "repo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "archive_offer" DROP CONSTRAINT "FK_cc0db48ab806ac28fd31556d7eb"`);
        await queryRunner.query(`ALTER TABLE "archive_offer" DROP COLUMN "issue_number"`);
        await queryRunner.query(`ALTER TABLE "archive_offer" ADD "issue_number" integer NOT NULL`);
        await queryRunner.query(`DROP TABLE "archive_offer"`);
    }

}
