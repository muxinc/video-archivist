import {MigrationInterface, QueryRunner} from "typeorm";

export class Init1600446979083 implements MigrationInterface {

    public async up(q: QueryRunner): Promise<void> {
      await q.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    }

    public async down(q: QueryRunner): Promise<void> {
    }

}
