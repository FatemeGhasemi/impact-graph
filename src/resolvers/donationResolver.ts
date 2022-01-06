import {
  Resolver,
  Query,
  Arg,
  Mutation,
  Ctx,
  ObjectType,
  Field,
} from 'type-graphql';
import { InjectRepository } from 'typeorm-typedi-extensions';
// import { getTokenPrices, getOurTokenList } from '../uniswap'
import { getTokenPrices, getOurTokenList } from 'monoswap';
import { Donation } from '../entities/donation';
import { MyContext } from '../types/MyContext';
import { Project } from '../entities/project';
import { getAnalytics, SegmentEvents } from '../analytics/analytics';
import { Token } from '../entities/token';
import { Repository, In } from 'typeorm';
import { User } from '../entities/user';
import Logger from '../logger';
import { errorMessages } from '../utils/errorMessages';
import { NETWORK_IDS } from '../provider';
import { updateTotalDonationsOfProject } from '../services/donationService';

const analytics = getAnalytics();

@ObjectType()
class PaginateDonations {
  @Field(type => [Donation], { nullable: true })
  donations: Donation[];

  @Field(type => Number, { nullable: true })
  totalCount: number;

  @Field(type => Number, { nullable: true })
  totalUsdBalance: number;

  @Field(type => Number, { nullable: true })
  totalEthBalance: number;
}

@Resolver(of => User)
export class DonationResolver {
  constructor(
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
  ) {}

  @Query(returns => [Donation], { nullable: true })
  async donations() {
    const donation = await this.donationRepository.find();

    return donation;
  }

  @Query(returns => [Donation], { nullable: true })
  async donationsFromWallets(
    @Ctx() ctx: MyContext,
    @Arg('fromWalletAddresses', type => [String])
    fromWalletAddresses: string[],
  ) {
    const fromWalletAddressesArray: string[] = fromWalletAddresses.map(o =>
      o.toLowerCase(),
    );

    const donations = await this.donationRepository.find({
      where: {
        fromWalletAddress: In(fromWalletAddressesArray),
      },
    });
    return donations;
  }

  @Query(returns => [Donation], { nullable: true })
  async donationsToWallets(
    @Ctx() ctx: MyContext,
    @Arg('toWalletAddresses', type => [String]) toWalletAddresses: string[],
  ) {
    const toWalletAddressesArray: string[] = toWalletAddresses.map(o =>
      o.toLowerCase(),
    );

    const donations = await this.donationRepository.find({
      where: {
        toWalletAddress: In(toWalletAddressesArray),
      },
    });
    return donations;
  }
  @Query(returns => PaginateDonations, { nullable: true })
  async donationsByProjectId(
    @Ctx() ctx: MyContext,
    @Arg('skip', { defaultValue: 0 }) skip: number,
    @Arg('take', { defaultValue: 10 }) take: number,
    @Arg('projectId', type => Number) projectId: number,
  ) {
    const query = this.donationRepository
      .createQueryBuilder('donation')
      .leftJoinAndSelect('donation.user', 'user')
      .where(`donation.projectId = ${projectId}`);

    const [donations, donationsCount] = await query
      .take(take)
      .skip(skip)
      .getManyAndCount();
    const balance = await query
      .select('SUM(donation.valueUsd)', 'usdBalance')
      .getRawOne();
    const ethBalance = await query
      .select('SUM(donation.valueEth)', 'ethBalance')
      .getRawOne();

    return {
      donations,
      totalCount: donationsCount,
      totalUsdBalance: balance.usdBalance,
      totalEthBalance: ethBalance.ethBalance,
    };
  }

  @Query(returns => [Token], { nullable: true })
  async tokens() {
    return getOurTokenList();
  }

  @Mutation(returns => [Number])
  async getTokenPrice(
    @Arg('symbol') symbol: string,
    @Arg('chainId') chainId: number,
  ) {
    const prices = await this.getMonoSwapTokenPrices(
      symbol,
      ['USDT', 'ETH'],
      Number(chainId),
    );
    return prices;
  }

  @Query(returns => [Donation], { nullable: true })
  async donationsByDonor(@Ctx() ctx: MyContext) {
    if (!ctx.req.user)
      throw new Error(
        'You must be logged in in order to register project donations',
      );
    const userId = ctx.req.user.userId;

    const donations = await this.donationRepository.find({
      where: {
        user: userId,
      },
    });

    return donations;
  }

  @Mutation(returns => Number)
  async saveDonation(
    @Arg('fromAddress') fromAddress: string,
    @Arg('toAddress') toAddress: string,
    @Arg('amount') amount: number,
    @Arg('transactionId', { nullable: true }) transactionId: string,
    @Arg('transactionNetworkId') transactionNetworkId: number,
    @Arg('tokenAddress', { nullable: true }) tokenAddress: string,
    @Arg('anonymous', { nullable: true }) anonymous: boolean,
    @Arg('token') token: string,
    @Arg('projectId') projectId: number,
    @Arg('chainId') chainId: number,
    @Arg('transakId', { nullable: true }) transakId: string,
    // TODO should remove this in the future, we dont use transakStatus in creating donation
    @Arg('transakStatus', { nullable: true }) transakStatus: string,
    @Ctx() ctx: MyContext,
  ): Promise<Number> {
    try {
      let userId = ctx?.req?.user?.userId || null;
      if (!chainId) chainId = NETWORK_IDS.MAIN_NET;
      const priceChainId =
        chainId === NETWORK_IDS.ROPSTEN ? NETWORK_IDS.MAIN_NET : chainId;
      let originUser;

      const project = await Project.findOne({ id: Number(projectId) });

      if (!project) throw new Error('Transaction project was not found.');
      if (project.walletAddress?.toLowerCase() !== toAddress.toLowerCase()) {
        throw new Error(
          errorMessages.TO_ADDRESS_OF_DONATION_SHOULD_BE_PROJECT_WALLET_ADDRESS,
        );
      }

      if (userId) {
        originUser = await User.findOne({ id: ctx.req.user.userId });
      } else {
        originUser = null;
      }

      // ONLY when logged in, allow setting the anonymous boolean
      const donationAnonymous =
        userId && anonymous !== undefined ? anonymous : !userId;

      const donation = await Donation.create({
        amount: Number(amount),
        transactionId: transactionId?.toLowerCase() || transakId,
        isFiat: Boolean(transakId),
        transactionNetworkId: Number(transactionNetworkId),
        currency: token,
        user: originUser,
        tokenAddress,
        project,
        createdAt: new Date(),
        toWalletAddress: toAddress.toString().toLowerCase(),
        fromWalletAddress: fromAddress.toString().toLowerCase(),
        anonymous: donationAnonymous,
      });
      await donation.save();
      const baseTokens =
        Number(priceChainId) === 1 ? ['USDT', 'ETH'] : ['WXDAI', 'WETH'];

      const tokenPrices = await this.getMonoSwapTokenPrices(
        token,
        baseTokens,
        Number(priceChainId),
      );

      if (tokenPrices.length !== 0) {
        donation.priceUsd = Number(tokenPrices[0]);
        donation.priceEth = Number(tokenPrices[1]);

        donation.valueUsd = Number(amount) * donation.priceUsd;
        donation.valueEth = Number(amount) * donation.priceEth;
      }

      await donation.save();

      // After updating price we update totalDonations
      await updateTotalDonationsOfProject(projectId);

      if (transakId) {
        // we send segment event for transak donations after the transak call our webhook to verifying transactions
        return donation.id;
      }

      const segmentDonationInfo = {
        slug: project.slug,
        title: project.title,
        amount: Number(amount),
        transactionId: transactionId.toLowerCase(),
        toWalletAddress: toAddress.toLowerCase(),
        fromWalletAddress: fromAddress.toLowerCase(),
        donationValueUsd: donation.valueUsd,
        donationValueEth: donation.valueEth,
        verified: Boolean(project.verified),
        projectOwnerId: project.admin,
        transactionNetworkId: Number(transactionNetworkId),
        currency: token,
        projectWalletAddress: project.walletAddress,
        createdAt: new Date(),
      };

      if (ctx.req.user && ctx.req.user.userId) {
        userId = ctx.req.user.userId;
        originUser = await User.findOne({ id: userId });
        analytics.identifyUser(originUser);
        if (!originUser)
          throw Error(`The logged in user doesn't exist - id ${userId}`);
        console.log(donation.valueUsd);

        const segmentDonationMade = {
          ...segmentDonationInfo,
          email: originUser != null ? originUser.email : '',
          firstName: originUser != null ? originUser.firstName : '',
          anonymous: !userId,
        };

        analytics.track(
          SegmentEvents.MADE_DONATION,
          originUser.segmentUserId(),
          segmentDonationMade,
          originUser.segmentUserId(),
        );
      }

      const projectOwner = await User.findOne({ id: Number(project.admin) });

      if (projectOwner) {
        analytics.identifyUser(projectOwner);

        const segmentDonationReceived = {
          ...segmentDonationInfo,
          email: projectOwner.email,
          firstName: projectOwner.firstName,
        };

        analytics.track(
          SegmentEvents.DONATION_RECEIVED,
          projectOwner.segmentUserId(),
          segmentDonationReceived,
          projectOwner.segmentUserId(),
        );
      }
      return donation.id;
    } catch (e) {
      Logger.captureException(e);
      console.error(e);
      throw new Error(e);
    }
  }

  private async getMonoSwapTokenPrices(
    token: string,
    baseTokens: Array<string>,
    chainId: number,
  ): Promise<Array<number>> {
    try {
      const tokenPrices = await getTokenPrices(token, baseTokens, chainId);

      return tokenPrices;
    } catch (e) {
      console.log('Unable to fetch monoswap prices: ', e);
      return [];
    }
  }
}