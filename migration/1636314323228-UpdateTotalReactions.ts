import { MigrationInterface, QueryRunner } from 'typeorm';
import { Reaction } from '../entities/reaction';

export class UpdateTotalReactions1636314323228 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" ADD COLUMN IF NOT EXISTS  "totalReactions" Integer default 0`,
    );
    const projects = await queryRunner.query(`select * from project`);
    for (const project of projects) {
      const totalReactions = await queryRunner.query(
        `select count(*) from reaction where "projectId"=${project.id}`,
      );
      await queryRunner.query(
        `update project set "totalReactions"=${totalReactions[0].count} where id=${project.id}`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE project DROP "totalReactions"`);
  }
}
