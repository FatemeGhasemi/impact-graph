import Axios, { AxiosResponse } from 'axios';
import slugify from 'slugify';
import config from '../../config';
import {
  Category,
  Project,
  ProjectUpdate,
  ProjStatus,
} from '../../entities/project';
import { ProjectStatus } from '../../entities/projectStatus';
import { errorMessages } from '../../utils/errorMessages';
import { logger } from '../../utils/logger';
import { getAppropriateSlug, getQualityScore } from '../projectService';

const changeAPICategoryName = 'Change';
const changeAPIHandle = 'change';

// Admin Account assigned by Giveth to handle this projects
const adminId =
  (config.get('THIRD_PARTY_PROYECTS_ADMIN_USER_ID') as string) || '1';

interface ChangeNonProfit {
  address_line?: string;
  category?: string;
  city?: string;
  classification?: string;
  crypto: {
    ethereum_address: string;
    solana_address?: string;
  };
  ein: string;
  icon_url: string;
  id: string;
  mission: string;
  name: string;
  socials: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
  state?: string;
  website?: string;
  zip_code?: string;
}

// exact title returns 1 element
export const getChangeNonProfitByNameOrIEN = async (
  nonProfit: String,
): Promise<ChangeNonProfit> => {
  try {
    const result = await Axios.get(
      'https://api.getchange.io/api/v1/nonprofits',
      {
        params: {
          public_key: config.get('CHANGE_API_KEYS') as string,
          search_term: nonProfit,
        },
      },
    );

    const nonProfits = result.data.nonprofits;
    if (nonProfits.length > 1)
      throw errorMessages.CHANGE_API_TITLE_OR_EIN_NOT_PRECISE;

    if (nonProfits.length === 0)
      throw errorMessages.CHANGE_API_INVALID_TITLE_OR_EIN;

    return nonProfits[0];
  } catch (e) {
    logger.error('changeAPI service err', e);
    throw e;
  }
};

export const createProjectFromChangeNonProfit = async (
  nonProfit: ChangeNonProfit,
) => {
  try {
    const changeCategory = await findOrCreateChangeAPICategory();
    const activeStatus = await ProjectStatus.findOne({ id: ProjStatus.active });

    const slugBase = slugify(nonProfit.name, {
      remove: /[*+~.,()'"!:@]/g,
    });
    const slug = await getAppropriateSlug(slugBase);

    const qualityScore = getQualityScore(
      nonProfit.mission,
      Boolean(nonProfit.icon_url),
    );

    const project = Project.create({
      title: nonProfit.name,
      description: nonProfit.mission,
      categories: [changeCategory],
      walletAddress: nonProfit.crypto.ethereum_address,
      creationDate: new Date(),
      slug,
      youtube: nonProfit.socials.youtube,
      website: nonProfit.website,
      image: nonProfit.icon_url,
      slugHistory: [],
      changeId: String(nonProfit.id),
      admin: adminId,
      status: activeStatus,
      qualityScore,
      totalDonations: 0,
      totalReactions: 0,
      totalProjectUpdates: 0,
      listed: true,
      verified: true,
      giveBacks: true,
      isImported: true,
    });
    await project.save();
    logger.debug(
      'This changeAPI project has been created in our db with ID:',
      project.id,
    );

    // create default projectUpdate to allow adding Reactions
    const update = ProjectUpdate.create({
      userId: Number(adminId),
      projectId: project.id,
      content: '',
      title: '',
      createdAt: new Date(),
      isMain: true,
    });

    await ProjectUpdate.save(update);
  } catch (e) {
    logger.error('createChangeAPIProject error', e);
    throw e;
  }
};

const findOrCreateChangeAPICategory = async (): Promise<Category> => {
  let category = await Category.findOne({ name: changeAPIHandle });

  if (!category) {
    category = new Category();
    category.name = changeAPIHandle;
    category.value = changeAPICategoryName;
    await category.save();
  }

  return category;
};
