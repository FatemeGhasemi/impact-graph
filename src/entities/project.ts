import { Field, Float, ID, ObjectType } from 'type-graphql';
import {
  AfterInsert,
  AfterUpdate,
  BaseEntity,
  BeforeRemove,
  Brackets,
  Column,
  Entity,
  Index,
  JoinTable,
  LessThan,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  SelectQueryBuilder,
  UpdateDateColumn,
} from 'typeorm';

import { Organisation } from './organisation';
import { Donation } from './donation';
import { Reaction } from './reaction';
import { Category } from './category';
import { User } from './user';
import { ProjectStatus } from './projectStatus';
import ProjectTracker from '../services/segment/projectTracker';
import { SegmentEvents } from '../analytics/analytics';
import { Int } from 'type-graphql/dist/scalars/aliases';

// tslint:disable-next-line:no-var-requires
const moment = require('moment');

export enum ProjStatus {
  rjt = 1,
  pen = 2,
  clr = 3,
  ver = 4,
  active = 5,
  deactive = 6,
  cancel = 7,
}

export enum OrderField {
  CreationDate = 'creationDate',
  UpdatedAt = 'updatedAt',
  Balance = 'balance',
  QualityScore = 'qualityScore',
  Verified = 'verified',
  Reactions = 'totalReactions',
  Traceable = 'traceCampaignId',
  Donations = 'totalDonations',
}

@Entity()
@ObjectType()
class Project extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field()
  @Column()
  title: string;

  @Index()
  @Field({ nullable: true })
  @Column({ nullable: true })
  slug?: string;

  @Index()
  @Field(type => [String], { nullable: true })
  @Column('text', { array: true, nullable: true })
  slugHistory?: string[];

  @Field({ nullable: true })
  @Column({ nullable: true })
  admin?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  traceCampaignId?: string;

  @Index({ unique: true, where: '"givingBlocksId" IS NOT NULL' })
  @Field({ nullable: true })
  @Column({ default: null, nullable: true })
  givingBlocksId?: string;

  @Field({ nullable: true })
  @Column({ default: null, nullable: true })
  website?: string;

  @Field({ nullable: true })
  @Column({ default: null, nullable: true })
  youtube?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  organisationId?: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  creationDate: Date;

  @Field({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  updatedAt: Date;

  @Field(type => [Organisation])
  @ManyToMany(type => Organisation)
  @JoinTable()
  organisations: Organisation[];

  @Field({ nullable: true })
  @Column({ nullable: true })
  coOrdinates?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  image?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  impactLocation?: string;

  @Field(type => [Category], { nullable: true })
  @ManyToMany(type => Category, category => category.projects, {
    nullable: true,
    eager: true,
    cascade: true,
  })
  @JoinTable()
  categories: Category[];

  @Field(type => Float, { nullable: true })
  @Column('float', { nullable: true })
  balance: number = 0;

  @Field({ nullable: true })
  @Column({ nullable: true })
  stripeAccountId?: string;

  @Field()
  @Column({ unique: true })
  walletAddress?: string;

  @Field(type => Boolean)
  @Column()
  verified: boolean;

  @Field(type => Boolean)
  @Column()
  giveBacks: boolean;

  @Field(type => [Donation], { nullable: true })
  @OneToMany(type => Donation, donation => donation.project)
  donations?: Donation[];

  @Field(type => Float, { nullable: true })
  @Column({ nullable: true })
  qualityScore: number = 0;

  @ManyToMany(type => User, user => user.projects, { eager: true })
  @JoinTable()
  @Field(type => [User], { nullable: true })
  users: User[];

  @Field(type => [Reaction], { nullable: true })
  @OneToMany(type => Reaction, reaction => reaction.project)
  reactions?: Reaction[];

  @Index()
  @Field(type => ProjectStatus)
  @ManyToOne(type => ProjectStatus, { eager: true })
  status: ProjectStatus;

  @RelationId((project: Project) => project.status)
  statusId: number;

  @Field(type => Float)
  @Column({ type: 'real' })
  totalDonations: number;

  @Field(type => Int, { nullable: true })
  @Column({ type: 'integer', nullable: true })
  totalReactions: number;

  @Field(type => Int, { nullable: true })
  @Column({ type: 'integer', nullable: true })
  totalProjectUpdates: number;

  @Field(type => Boolean, { nullable: true })
  @Column({ type: 'boolean', default: null, nullable: true })
  listed?: boolean | null;

  // Virtual attribute to subquery result into
  @Field(type => User, { nullable: true })
  adminUser?: User;

  /**
   * Custom Query Builders to chain together
   */

  static addCategoryQuery(
    query: SelectQueryBuilder<Project>,
    category: string,
  ) {
    return query.innerJoin(
      'project.categories',
      'category',
      'category.name = :category',
      { category },
    );
  }

  static addSearchQuery(
    query: SelectQueryBuilder<Project>,
    searchTerm: string,
  ) {
    return query.andWhere(
      new Brackets(qb => {
        qb.where('project.title ILIKE :searchTerm', {
          searchTerm: `%${searchTerm}%`,
        })
          .orWhere('project.description ILIKE :searchTerm', {
            searchTerm: `%${searchTerm}%`,
          })
          .orWhere('project.impactLocation ILIKE :searchTerm', {
            searchTerm: `%${searchTerm}%`,
          });
      }),
    );
  }

  static addFilterQuery(query: any, filter: string, filterValue: boolean) {
    if (filter === 'givingBlocksId') {
      const acceptGiv = filterValue ? 'IS' : 'IS NOT';
      return query.andWhere(`project.${filter} ${acceptGiv} NULL`);
    }

    if (filter === 'traceCampaignId') {
      const isRequested = filterValue ? 'IS NOT' : 'IS';
      return query.andWhere(`project.${filter} ${isRequested} NULL`);
    }

    return query.andWhere(`project.${filter} = ${filterValue}`);
  }

  // Backward Compatible Projects Query with added pagination, frontend sorts and category search
  static searchProjects(
    limit: number,
    offset: number,
    sortBy: string,
    direction: any,
    category: string,
    searchTerm: string,
    filter: string,
    filterValue: boolean,
  ) {
    const query = this.createQueryBuilder('project')
      .leftJoinAndSelect('project.status', 'status')
      // TODO It was very expensive query and made our backend down in production, maybe we should remove the reactions as well
      // .leftJoinAndSelect('project.donations', 'donations')
      .leftJoinAndSelect('project.reactions', 'reactions')
      .leftJoinAndSelect('project.users', 'users')
      .leftJoinAndMapOne(
        'project.adminUser',
        User,
        'user',
        'user.id = CAST(project.admin AS INTEGER)',
      )
      .innerJoinAndSelect('project.categories', 'c')
      .where(
        `project.statusId = ${ProjStatus.active} AND project.listed = true`,
      );

    // Filters
    if (category) this.addCategoryQuery(query, category);
    if (searchTerm) this.addSearchQuery(query, searchTerm);
    if (filter) this.addFilterQuery(query, filter, filterValue);

    if (sortBy == 'traceCampaignId') {
      // TODO: PRISMA will fix this, temporary fix inverting nulls.
      let traceableDirection = { ASC: 'NULLS FIRST', DESC: 'NULLS LAST' };
      query.orderBy(
        `project.${sortBy}`,
        direction,
        traceableDirection[direction],
      );
    } else {
      query.orderBy(`project.${sortBy}`, direction);
    }

    const projects = query.take(limit).skip(offset).getMany();
    const totalCount = query.getCount();

    return Promise.all([projects, totalCount]);
  }

  static notifySegment(project: Project, eventName: SegmentEvents) {
    new ProjectTracker(project, eventName).track();
  }

  static sendBulkEventsToSegment(
    projects: [Project],
    eventName: SegmentEvents,
  ) {
    for (const project of projects) {
      this.notifySegment(project, eventName);
    }
  }

  static pendingReviewSince(maximumDaysForListing: Number) {
    const maxDaysForListing = moment()
      .subtract(maximumDaysForListing, 'days')
      .endOf('day');

    return this.createQueryBuilder('project')
      .where({ updatedAt: LessThan(maxDaysForListing) })
      .andWhere('project.listed IS NULL')
      .getMany();
  }

  @Field(type => Float, { nullable: true })
  reactionsCount() {
    return this.reactions ? this.reactions.length : 0;
  }

  // Status 7 is deleted status
  mayUpdateStatus(user: User) {
    if (this.statusId === ProjStatus.cancel) return false;

    if (this.users.filter(o => o.id === user.id).length > 0) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Add / remove a heart to the score
   * @param loved true to add a heart, false to remove
   */
  updateQualityScoreHeart(loved: boolean) {
    // TODO should remove this, we should have a function to calculate score from scratch everytime
    if (loved) {
      this.qualityScore = this.qualityScore + 10;
    } else {
      this.qualityScore = this.qualityScore - 10;
    }
  }

  owner() {
    return this.users[0];
  }

  @AfterUpdate()
  notifyProjectEdited() {
    Project.notifySegment(this, SegmentEvents.PROJECT_EDITED);
  }
}

@Entity()
@ObjectType()
class ProjectUpdate extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field(type => String)
  @Column()
  title: string;

  @Field(type => ID)
  @Column()
  projectId: number;

  @Field(type => ID)
  @Column()
  userId: number;

  @Field(type => String)
  @Column()
  content: string;

  @Field(type => Date)
  @Column()
  createdAt: Date;

  @Field(type => Boolean)
  @Column({ nullable: true })
  isMain: boolean;

  @AfterInsert()
  async updateProjectStampOnCreation() {
    await Project.update({ id: this.projectId }, { updatedAt: moment() });
  }

  @BeforeRemove()
  async updateProjectStampOnDeletion() {
    await Project.update({ id: this.projectId }, { updatedAt: moment() });
  }
}

export { Project, Category, ProjectUpdate };