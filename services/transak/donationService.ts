import { Donation, DONATION_STATUS } from '../../entities/donation';
import { Project } from '../../entities/project';
import { User } from '../../entities/user';
import DonationTracker from '../segment/DonationTracker';
import { TransakOrder } from './order';
const TRANSAK_COMPLETED_STATUS = 'COMPLETED';

export const updateDonationByTransakData = async (
  transakData: TransakOrder,
) => {
  const donation = await Donation.findOne({
    transactionId: transakData.webhookData.id,
  });
  if (!donation) throw new Error('Donation not found.');
  let donationProjectIsValid = true;
  donation.transakStatus = transakData.webhookData.status;
  donation.currency = transakData.webhookData.cryptocurrency;
  donation.fromWalletAddress = transakData.webhookData.fromWalletAddress;
  if (donation.amount !== transakData.webhookData.cryptoAmount) {
    // If the transaction amount is different with donation amount
    // it proves it's might be fraud, so we change the valueEth and valueUsd
    donation.valueUsd =
      donation.valueUsd *
      (transakData.webhookData.cryptoAmount / donation.amount);
    donation.valueEth =
      donation.valueEth *
      (transakData.webhookData.cryptoAmount / donation.amount);
    donation.amount = transakData.webhookData.cryptoAmount;
  }

  if (
    donation.toWalletAddress.toLowerCase() !==
    transakData.webhookData.walletAddress.toLowerCase()
  ) {
    // we should check the walletAddress is matched with what is in donation, ir prevents fraud
    donation.toWalletAddress = transakData.webhookData.walletAddress;
    const project = await Project.findOne({
      walletAddress: transakData.webhookData.walletAddress,
    });
    if (project) {
      donation.projectId = project.id || 0;
    } else {
      donationProjectIsValid = false;
    }
  }

  if (TRANSAK_COMPLETED_STATUS === donation.transakStatus) {
    notifyTransakUpdate(donation);
    if (donationProjectIsValid) {
      donation.status = DONATION_STATUS.VERIFIED;
    }
  }
  await donation.save();
};
const notifyTransakUpdate = async donation => {
  const project = await Project.findOne({ id: donation.projectId });
  const owner = await User.findOne({ id: Number(project?.admin) });

  // Notify Owner of donation, and notify authenticated user his donation was received
  if (project && owner) {
    new DonationTracker(donation, project, owner, 'Donation received').track();

    // anonymous boolean is inverted in our db and code. Anonymous Users are the authenticated.
    if (donation.anonymous) {
      const donor = await User.findOne({ id: donation.userId });

      if (donor) new DonationTracker(donation, project, donor, 'Made donation');
    }
  }
};
