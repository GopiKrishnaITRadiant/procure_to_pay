import { DeepPartial } from "mongoose";
import { exchangeRatesModel, IExchangeRate } from "../../src/models/exchangeRateModel";

const now = new Date();

const exchangeRates = [
  {
    baseCurrency: "USD",
    targetCurrency: "INR",
    rate: 83.25,
    rateType: "SPOT",
    source: "SEED",
  },
  {
    baseCurrency: "EUR",
    targetCurrency: "INR",
    rate: 90.1,
    rateType: "SPOT",
    source: "SEED",
  },
  {
    baseCurrency: "GBP",
    targetCurrency: "INR",
    rate: 104.3,
    rateType: "SPOT",
    source: "SEED",
  },
  {
    baseCurrency: "USD",
    targetCurrency: "EUR",
    rate: 0.92,
    rateType: "SPOT",
    source: "SEED",
  },
];

export const seedExchangeRates = async () => {
  console.log(" Seeding Exchange Rates...");

  const ops = exchangeRates.map((r) => ({
  updateOne: {
    filter: {
      baseCurrency: r.baseCurrency,
      targetCurrency: r.targetCurrency,
      rateType: r.rateType,
      validFrom: now,
    },
    update: {
      $setOnInsert: {
        baseCurrency: r.baseCurrency.toUpperCase(),
        targetCurrency: r.targetCurrency.toUpperCase(),
        rate: r.rate,
        validFrom: now,
        validTo: undefined,
        isActive: true,
        rateType: r.rateType,
        source: r.source,
      } as DeepPartial<IExchangeRate>,
    },
    upsert: true,
  },
}));

  await exchangeRatesModel.bulkWrite(ops);

  console.log("Exchange Rates Seeded");
};
