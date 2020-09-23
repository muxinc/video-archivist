import {MigrationInterface, QueryRunner} from "typeorm";

export class UniqueOriginalUrlInVideo1600876101941 implements MigrationInterface {
    name = 'UniqueOriginalUrlInVideo1600876101941'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "video" ADD CONSTRAINT "UQ_11a55df2d33e33773cfc72a5243" UNIQUE ("original_url")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "video" DROP CONSTRAINT "UQ_11a55df2d33e33773cfc72a5243"`);
    }

}
