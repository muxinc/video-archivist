import {MigrationInterface, QueryRunner} from "typeorm";

export class AddUrlToVideos1600461521420 implements MigrationInterface {
    name = 'AddUrlToVideos1600461521420'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "video" ADD "url" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "video" DROP COLUMN "url"`);
    }

}
