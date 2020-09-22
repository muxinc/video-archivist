import {MigrationInterface, QueryRunner} from "typeorm";

export class AddProcessedFlag1600796206800 implements MigrationInterface {
    name = 'AddProcessedFlag1600796206800'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "archive_offer" ADD "processed" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "archive_offer" DROP CONSTRAINT "FK_cc0db48ab806ac28fd31556d7eb"`);
        await queryRunner.query(`ALTER TABLE "archive_offer" ALTER COLUMN "repo_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "archive_offer" ALTER COLUMN "repo_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "archive_offer" ADD CONSTRAINT "FK_cc0db48ab806ac28fd31556d7eb" FOREIGN KEY ("repo_id") REFERENCES "repo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "archive_offer" DROP CONSTRAINT "FK_cc0db48ab806ac28fd31556d7eb"`);
        await queryRunner.query(`ALTER TABLE "archive_offer" ALTER COLUMN "repo_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "archive_offer" ALTER COLUMN "repo_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "archive_offer" ADD CONSTRAINT "FK_cc0db48ab806ac28fd31556d7eb" FOREIGN KEY ("repo_id") REFERENCES "repo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "archive_offer" DROP COLUMN "processed"`);
    }

}
