export interface Campaign {
  title:string;
  slug:string;
  description: string;

  // campaign._id
  campaignId:string;

  // campaign.ownerAddress
  admin:string

  // campaign.image
  image:string

  // campaign.updatedAt
  creationDate:string

}