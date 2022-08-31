import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCategoryAndAddOrder1661951371067
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const categories = await queryRunner.query(`SELECT * FROM category`);
    if (categories.length > 0) {
      return;
    }

    await queryRunner.query(`INSERT INTO public.category (id, name, value, source, "isActive", "mainCategoryId", "order") VALUES 
                    (1,'community','Community','adhoc',true,1,1),
                    (2,'food','Food','adhoc',true,1,1),
                    (3,'non-profit','Non-profit','adhoc',true,1,1),
                    (4,'housing','Housing','adhoc',true,1,1),
                    (5,'technology','Technology','adhoc',true,2,4),
                    (6,'research','Research','adhoc',true,1,4),
                    (7,'nutrition','Nutrition','adhoc',true,2,4),
                    (8,'art-culture','Art & Culture','adhoc',true,1,2),
                    (9,'agriculture','Agriculture','adhoc',true,1,2),
                    (10,'air','Air','adhoc',true,1,2),
                    (11,'biodiversity','Biodiversity','adhoc',true,1,3),
                    (12,'climate','Climate','adhoc',true,1,3),
                    (13,'inclusion','Inclusion','adhoc',true,2,1),
                    (14,'education','Education','adhoc',true,1,2),
                    (15,'employment','Employment','adhoc',true,1,2),
                    (16,'energy','Energy','adhoc',true,1,1)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM category`);
  }
}
