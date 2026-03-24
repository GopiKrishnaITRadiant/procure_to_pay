import cron from "node-cron";
import { runSubscriptionLifecycle } from "../services/subscriptionLifecycleService";

export const startSubscriptionCron = () => {
  //daily 1am night
  cron.schedule("0 1 * * *", async () => {
    console.log("Running subscription lifecycle cron...");
    await runSubscriptionLifecycle();
  });
};