import {MigrationInterface, QueryRunner} from "typeorm";

export class AddSecretToRepos1600719433273 implements MigrationInterface {
    name = 'AddSecretToRepos1600719433273'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repo" ADD "webhook_secret" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repo" DROP COLUMN "webhook_secret"`);
    }

}
