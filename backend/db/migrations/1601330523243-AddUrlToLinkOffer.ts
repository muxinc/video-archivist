import {MigrationInterface, QueryRunner} from "typeorm";

export class AddUrlToLinkOffer1601330523243 implements MigrationInterface {
    name = 'AddUrlToLinkOffer1601330523243'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "link_offer" ADD "url" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "link_offer" DROP COLUMN "url"`);
    }

}
