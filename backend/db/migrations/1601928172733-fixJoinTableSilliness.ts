import {MigrationInterface, QueryRunner} from "typeorm";

export class fixJoinTableSilliness1601928172733 implements MigrationInterface {
    name = 'fixJoinTableSilliness1601928172733'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repo_videos" DROP CONSTRAINT "FK_c58c81fc8cb844439a4e5b82c38"`);
        await queryRunner.query(`ALTER TABLE "repo_videos" DROP CONSTRAINT "FK_46ad2973f2ef066d8d0b30c4597"`);
        await queryRunner.query(`ALTER TABLE "repo_videos" ADD CONSTRAINT "FK_46ad2973f2ef066d8d0b30c4597" FOREIGN KEY ("video") REFERENCES "video"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "repo_videos" ADD CONSTRAINT "FK_c58c81fc8cb844439a4e5b82c38" FOREIGN KEY ("repo") REFERENCES "repo"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repo_videos" DROP CONSTRAINT "FK_c58c81fc8cb844439a4e5b82c38"`);
        await queryRunner.query(`ALTER TABLE "repo_videos" DROP CONSTRAINT "FK_46ad2973f2ef066d8d0b30c4597"`);
        await queryRunner.query(`ALTER TABLE "repo_videos" ADD CONSTRAINT "FK_46ad2973f2ef066d8d0b30c4597" FOREIGN KEY ("video") REFERENCES "repo"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "repo_videos" ADD CONSTRAINT "FK_c58c81fc8cb844439a4e5b82c38" FOREIGN KEY ("repo") REFERENCES "video"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
