import { Donation } from '../entities/donation';
import { schedule } from 'node-cron';
import { fetchGivHistoricPrice } from './givPriceService';
import { convertExponentialNumber } from '../utils/utils';

const cronJobTime =
  process.env.REVIEW_OLD_GIV_PRICES_CRONJOB_EXPRESSION || '0 0 * * *';

export const runUpdateHistoricGivPrices = () => {
  console.log('runUpdateHistoricGivPrices() has been called');
  schedule(cronJobTime, async () => {
    await updateOldGivDonationPrice();
  });
};

const toFixNumber = (input: number, digits: number): number => {
  return convertExponentialNumber(Number(input.toFixed(digits)));
};

const updateOldGivDonationPrice = async () => {
  const donations = await Donation.findXdaiGivDonationsWithoutPrice();
  console.log('updateOldGivDonationPrice donations count', donations.length);
  for (const donation of donations) {
    console.log(
      'updateOldGivDonationPrice() updating accurate price, donationId',
      donation.id,
    );
    try {
      const givHistoricPrices = await fetchGivHistoricPrice(
        donation.transactionId,
      );
      console.log('Update donation usd price ', {
        donationId: donation.id,
        ...givHistoricPrices,
        valueEth: toFixNumber(
          donation.amount * givHistoricPrices.givPriceInEth,
          6,
        ),
      });
      donation.priceEth = toFixNumber(givHistoricPrices.ethPriceInUsd, 6);
      donation.priceUsd = toFixNumber(givHistoricPrices.givPriceInUsd, 3);
      donation.valueUsd = toFixNumber(
        donation.amount * givHistoricPrices.givPriceInUsd,
        3,
      );
      donation.valueEth = toFixNumber(
        donation.amount * givHistoricPrices.givPriceInEth,
        6,
      );
      await donation.save();
    } catch (e) {
      console.log('Update GIV donation valueUsd error', e.message);
    }
  }
};
