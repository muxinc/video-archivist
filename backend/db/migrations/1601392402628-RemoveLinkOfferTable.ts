import {MigrationInterface, QueryRunner} from "typeorm";

export class RemoveLinkOfferTable1601392402628 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.dropTable('link_offer');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      throw new Error('one-way migration');
    }

}
