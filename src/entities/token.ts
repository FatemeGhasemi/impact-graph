import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToMany,
} from 'typeorm';
import { Organization } from './organization';

@Entity()
@ObjectType()
export class Token extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column('text')
  name: string;

  @Field()
  @Column('text')
  symbol: string;

  @Field()
  @Column('text')
  address: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  // Some tokens like PAN, XNODE, CRV dont have price on coingecko for gnosis network, So frontend guys suggested
  // add  mainnetAddress field for those tokens, then client can get price of these tokens in mainnet
  mainnetAddress: string;

  @Field()
  @Column()
  networkId: number;

  @Field()
  @Column()
  decimals: number;

  // @Field(type => [Organization])
  // @JoinTable()

  @ManyToMany(type => Organization, organization => organization.tokens)
  organizations: Organization[];
}
