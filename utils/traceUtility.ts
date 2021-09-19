import { schedule } from 'node-cron'
import { InjectRepository } from 'typeorm-typedi-extensions';
import { Project } from '../entities/project';
import { Repository } from 'typeorm';
import { Service } from 'typedi';
import { Campaign } from '../types/Trace';

@Service()
export class TraceUtility {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>) {
  }

  startSyncingTraceProjects() {
    console.log('running a task every minute')
    // cron.schedule('0 0 0 * *', () => {
    schedule('* * * * *', () => {
      console.log('running a task every minute')
    })
  }

  private async upsertCampaignProject(campaign: Campaign) {
    const result = await this.projectRepository.update({
        campaignId: campaign.campaignId
      },
      campaign
    )
    console.log('upsertCampaignProject() result of update', result)
    if (!result.affected) {
      await this.projectRepository.save(campaign)
    }
  }

}