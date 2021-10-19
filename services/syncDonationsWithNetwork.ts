import { Donation, DONATION_STATUS } from '../entities/donation'
import { getTransactionDetail } from './transactionService'
import { errorMessages } from '../utils/errorMessages'
import { schedule } from 'node-cron'

// @ts-ignore
// everything I used had problem so I had to add ts-ignore https://github.com/OptimalBits/bull/issues/1772
import Bull from 'bull'
import config from '../config'

const verifyDonationsQueue = new Bull('verify-donations-queue')

// As etherscan free plan support 5 request per second I think it's better the concurrent jobs should not be
// more than 5 with free plan https://etherscan.io/apis
const numberOfVerifyDonationConcurrentJob =
  Number(config.get('NUMBER_OF_VERIFY_DONATION_CONCURRENT_JOB')) || 1

const cronJobTime =
  String(config.get('VERIFY_DONATION_CRONJOB_EXPRESSION')) || '0 0 * * * *'

export const runCheckPendingDonationsCronJob = () => {
  console.log('runCheckPendingDonationsCronJob() has been called')
  // https://github.com/node-cron/node-cron#cron-syntax
  schedule(cronJobTime, async () => {
    await addJobToCheckPendingDonationsWithNetwork()
  })
}

const addJobToCheckPendingDonationsWithNetwork = async () => {
  const donations = await Donation.find({
    where: {
      status: DONATION_STATUS.PENDING
    },
    select: ['id']
  })
  if (donations.length === 0) {
    console.log('There is no pending donation to check with network')
  }
  donations.forEach(donation => {
    verifyDonationsQueue.add({
      donationId: donation.id
    })
  })
}

verifyDonationsQueue.process(
  numberOfVerifyDonationConcurrentJob,
  async (job, done) => {
    const { donationId } = job.data
    console.log('job processing', { jobData: job.data })
    const donation = await Donation.findOne(donationId)
    if (!donation) {
      throw new Error(errorMessages.DONATION_NOT_FOUND)
    }
    try {
      if (
        donation.toWalletAddress.toLowerCase() !==
        donation.project.walletAddress?.toLowerCase()
      ) {
        donation.verifyErrorMessage =
          errorMessages.TO_ADDRESS_OF_DONATION_SHOULD_BE_PROJECT_WALLET_ADDRESS
        donation.status = DONATION_STATUS.FAILED
        await donation.save()
        return done()
      }
      const transaction = await getTransactionDetail({
        nonce: donation.nonce,
        networkId: donation.transactionNetworkId,
        toAddress: donation.toWalletAddress,
        fromAddress: donation.fromWalletAddress,
        amount: donation.amount,
        symbol: donation.currency,
        txHash: donation.transactionId
      })
      if (transaction.speedup) {
        donation.speedup = true
      }
      donation.status = DONATION_STATUS.VERIFIED
      await donation.save()
      console.log('donation and transaction', {
        transaction,
        donationId: donation.id
      })
      done()
    } catch (e) {
      done()
      console.log('checkPendingDonations() error', {
        error: e,
        donationId: donation.id
      })

      if (failedVerifiedDonationErrorMessages.includes(e.message)) {
        // if error message is in failedVerifiedDonationErrorMessages then we know we should change the status to failed
        // otherwise we leave it to be checked in next cycle
        donation.verifyErrorMessage = e.message
        donation.status = DONATION_STATUS.FAILED
        await donation.save()
      }
    }
  }
)

const failedVerifiedDonationErrorMessages = [
  errorMessages.TRANSACTION_SMART_CONTRACT_CONFLICTS_WITH_CURRENCY,
  errorMessages.INVALID_NETWORK_ID,
  errorMessages.TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS
]
