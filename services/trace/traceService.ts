import { Project, ProjStatus } from '../../entities/project';
import { errorMessages } from '../../utils/errorMessages';
import { ProjectStatus } from '../../entities/projectStatus';
import { RedisOptions } from 'ioredis';
// tslint:disable-next-line:no-var-requires
const Queue = require('bull');

// There is shared redis between giveth.io and trace.giveth.io notify each other about verifiedCampaigns/project update
const redisConfig: RedisOptions = {
  host: process.env.SHARED_REDIS_HOST,
  port: Number(process.env.SHARED_REDIS_PORT),
};
if (process.env.SHARED_REDIS_PASSWORD) {
  redisConfig.password = process.env.SHARED_REDIS_PASSWORD;
}

const updateCampaignQueue = new Queue('trace-campaign-updated', {
  redis: redisConfig,
});
const updateGivethIoProjectQueue = new Queue('givethio-project-updated', {
  redis: redisConfig,
});

export interface UpdateCampaignData {
  title: string;
  campaignId?: string;
  description: string;
  verified?: boolean;
  archived?: boolean;
}

export const dispatchProjectUpdateEvent = async (
  project: Project,
): Promise<void> => {
  try {
    if (!project.isTraceable) {
      console.log(
        'updateCampaignInTrace(), the project is not a trace campaign',
        {
          projectId: project.id,
        },
      );
      return;
    }
    const payload: UpdateCampaignData = {
      campaignId: project.traceCampaignId,
      title: project.title,
      description: project.description as string,
      verified: project.verified,
      archived: project.statusId === ProjStatus.cancel,
    };

    // Giveth trace will handle this event
    await updateGivethIoProjectQueue.add(payload);
  } catch (e) {
    console.log('updateCampaignInTrace() error', {
      e,
      project,
    });
  }
};

updateCampaignQueue.process(1, async (job, done) => {
  // These events come from Gievth trace
  try {
    const { givethIoProjectId, campaignId, status, title, description } =
      job.data;
    console.info('updateGivethIoProjectQueue(), job.data', job.data);
    const project = await Project.findOne(givethIoProjectId);
    if (!project) {
      throw new Error(errorMessages.PROJECT_NOT_FOUND);
    }
    project.isTraceable = true;
    project.traceCampaignId = campaignId;
    project.title = title;
    project.description = description;
    let statusId;
    if (status === 'Archived') {
      statusId = ProjStatus.cancel;
    } else if (status === 'Active' && project.status.id === ProjStatus.cancel) {
      // Maybe project status is deactive in giveth.io, so we should not
      // change to active in this case, we just change the cancel status to active with this endpoint
      statusId = ProjStatus.active;
    }
    if (statusId) {
      const projectStatus = (await ProjectStatus.findOne({
        id: statusId,
      })) as ProjectStatus;
      project.status = projectStatus;
    }

    await project.save();
    done();
  } catch (e) {
    console.error('updateGivethIoProjectQueue() error', e);
    done();
  }
});
