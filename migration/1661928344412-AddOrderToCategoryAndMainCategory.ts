import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderToCategoryAndMainCategory1661928344412
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {


    await queryRunner.query(`
         CREATE TABLE IF NOT EXISTS public.main_category
            (
                id SERIAL NOT NULL,
                title text COLLATE pg_catalog."default",
                slug text COLLATE pg_catalog."default",
                description text COLLATE pg_catalog."default",
                "order" integer NOT NULL ,
                banner text COLLATE pg_catalog."default",
                CONSTRAINT "PK_1de960b48ce264cb705906a30d6" PRIMARY KEY (id),
                CONSTRAINT "UQ_94a55911924728435f0a81a4dd2" UNIQUE (title)
            )
        `);

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "category" (
            "id" SERIAL NOT NULL,
           "name" text NOT NULL, "value" character varying, 
           "source" character varying, CONSTRAINT "UQ_23c05c292c439d77b0de816b500" UNIQUE ("name"), 
           "order" integer COLLATE pg_catalog."default",
           CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03" PRIMARY KEY ("id"))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query(`DROP TABLE "category"`);
      await queryRunner.query(`DROP TABLE "main_category"`);
    } catch (e) {
      console.log('AddOrderToCategoryAndMainCategory1661928344412 error', e);
    }
  }
}
