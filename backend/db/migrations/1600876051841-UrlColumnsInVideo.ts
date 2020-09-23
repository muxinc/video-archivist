import {MigrationInterface, QueryRunner} from "typeorm";

export class UrlColumnsInVideo1600876051841 implements MigrationInterface {
    name = 'UrlColumnsInVideo1600876051841'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "video" DROP COLUMN "original_filename"`);
        await queryRunner.query(`ALTER TABLE "video" DROP COLUMN "url"`);
        await queryRunner.query(`ALTER TABLE "video" ADD "original_url" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "video" ADD "archive_url" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "video" DROP COLUMN "archive_url"`);
        await queryRunner.query(`ALTER TABLE "video" DROP COLUMN "original_url"`);
        await queryRunner.query(`ALTER TABLE "video" ADD "url" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "video" ADD "original_filename" character varying NOT NULL`);
    }

}
