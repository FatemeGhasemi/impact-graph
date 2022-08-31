import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMainCategory1661951280029 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
           INSERT INTO public.main_category(id, title, slug, description, banner,"order") VALUES
             ( 1, 'Environment & Energy','environment-and-energy', '', '',5),
             ( 2, 'Economics & Infrastructure','economic-and-infrastructure', '', '',4),
             ( 3, 'Health & Wellness','health-and-wellness', '', '',1),
             ( 4, 'Technology & Education','technology-and-education', '', '',1),
             ( 5, 'Art & Culture','art-and-culture', '', '',2),
             ( 6, 'Non-profit','non-profit', '', '',2)
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM main_category`);
  }
}
