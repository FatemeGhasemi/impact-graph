import { bootstrap } from '../src/server/bootstrap';
import {
  saveProjectDirectlyToDb,
  saveDonationDirectlyToDb,
  SEED_DATA,
  DONATION_SEED_DATA,
  REACTION_SEED_DATA,
  PROJECT_UPDATE_SEED_DATA,
} from './testUtils';
import { User } from '../src/entities/user';
// var pgtools = require('pgtools');
import { dropdb, createdb } from 'pgtools';
import { Category } from '../src/entities/category';
import { ProjectStatus } from '../src/entities/projectStatus';
import { Project, ProjectUpdate, ProjStatus } from '../src/entities/project';
import { Reaction } from '../src/entities/reaction';
import { Donation } from '../src/entities/donation';
import { ProjectStatusReason } from '../src/entities/projectStatusReason';

// This can also be a connection string
// (in which case the database part is ignored and replaced with postgres)

async function dropDatabaseAndCreateFreshOne() {
  const config = {
    user: process.env.TYPEORM_DATABASE_USER,
    password: process.env.TYPEORM_DATABASE_PASSWORD,
    port: process.env.TYPEORM_DATABASE_PORT,
    host: process.env.TYPEORM_DATABASE_HOST,
  };

  // tslint:disable-next-line:no-console
  console.log('Dropping DB');
  try {
    await dropdb(config, process.env.TYPEORM_DATABASE_NAME);
  } catch (e) {
    // tslint:disable-next-line:no-console
    console.log('drop db error', e);
  }

  // tslint:disable-next-line:no-console
  console.log('Create Fresh DB');
  try {
    await createdb(config, process.env.TYPEORM_DATABASE_NAME);
  } catch (e) {
    // tslint:disable-next-line:no-console
    console.log('Create Fresh db error', e);
  }
}

async function seedDb() {
  await seedUsers();
  await seedCategories();
  await seedStatuses();
  await seedProjects();
  await seedProjectUpdates();
  await seedLikes();
  await seedDonations();
  await seedStatusReasons();
}
async function seedUsers() {
  await User.create(SEED_DATA.FIRST_USER).save();
  await User.create(SEED_DATA.SECOND_USER).save();
  await User.create(SEED_DATA.ADMIN_USER).save();
}
async function seedProjects() {
  await saveProjectDirectlyToDb(SEED_DATA.FIRST_PROJECT);
  await saveProjectDirectlyToDb(SEED_DATA.SECOND_PROJECT);
  await saveProjectDirectlyToDb(SEED_DATA.TRANSAK_PROJECT);
}

async function seedProjectUpdates() {
  await ProjectUpdate.create(
    PROJECT_UPDATE_SEED_DATA.FIRST_PROJECT_UPDATE,
  ).save();
  await ProjectUpdate.create(
    PROJECT_UPDATE_SEED_DATA.SECOND_PROJECT_UPDATE,
  ).save();
  await ProjectUpdate.create(
    PROJECT_UPDATE_SEED_DATA.THIRD_PROJECT_UPDATE,
  ).save();
}

async function seedLikes() {
  await Reaction.create(REACTION_SEED_DATA.FIRST_LIKED_PROJECT_REACTION).save();
  await Project.update(
    { id: SEED_DATA.FIRST_PROJECT.id },
    { totalReactions: 1, qualityScore: 10 },
  );

  await Reaction.create(
    REACTION_SEED_DATA.FIRST_LIKED_PROJECT_UPDATE_REACTION,
  ).save();
  await ProjectUpdate.update(
    { id: SEED_DATA.FIRST_PROJECT.id },
    { totalReactions: 1 },
  );
}
async function seedDonations() {
  await saveDonationDirectlyToDb(
    DONATION_SEED_DATA.FIRST_DONATION,
    SEED_DATA.FIRST_USER.id,
    SEED_DATA.FIRST_PROJECT.id,
  );
  await saveDonationDirectlyToDb(
    DONATION_SEED_DATA.SECOND_DONATION,
    SEED_DATA.FIRST_USER.id,
    SEED_DATA.FIRST_PROJECT.id,
  );
  await saveDonationDirectlyToDb(
    DONATION_SEED_DATA.INCOMPLETED_TRANSAK_DONATION,
    SEED_DATA.THIRD_USER.id,
    SEED_DATA.FIRST_PROJECT.id,
  );
  await saveDonationDirectlyToDb(
    DONATION_SEED_DATA.COMPLETED_TRANSAK_DONATION,
    SEED_DATA.THIRD_USER.id,
    SEED_DATA.FIRST_PROJECT.id,
  );
}
async function seedCategories() {
  for (const category of SEED_DATA.CATEGORIES) {
    await Category.create({
      name: category,
      value: category,
      source: 'adhoc',
    }).save();
  }
}
async function seedStatuses() {
  for (const status of SEED_DATA.STATUSES) {
    await ProjectStatus.create(status).save();
  }
}
async function seedStatusReasons() {
  for (const { description, statusId } of SEED_DATA.STATUS_REASONS) {
    const status = await ProjectStatus.findOne({ id: statusId });
    await ProjectStatusReason.create({ description, status }).save();
  }
}

before(async () => {
  try {
    await dropDatabaseAndCreateFreshOne();
    await bootstrap();
    await seedDb();
  } catch (e) {
    throw new Error(`Could not setup tests requirements \n${e.message}`);
  }
});
