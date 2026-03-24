import {
  tenantSubscriptionModel,
  ITenantSubscription,
} from "../models/tenantSubscriptionModel";
import { addDays, startOfDay, endOfDay } from "date-fns";

const GRACE_DAYS = 3;

/**
 * ENTRY POINT
 */
export const runSubscriptionLifecycle = async () => {
  const now = new Date();

  try {
    console.log("Running subscription lifecycle:", now);

    await handleTrialReminders(now);
    await transitionExpiredTrials(now);
    await transitionExpiredPaidPlans(now);
    await suspendGraceExpired(now);

    console.log("Subscription lifecycle completed");
  } catch (error) {
    console.error("Subscription lifecycle error:", error);
  }
};

//Trial Reminder Emails
async function handleTrialReminders(now: Date) {
  const steps = [
    { days: 7, field: "trial7DaySent", type: "TRIAL_7_DAYS" },
    { days: 2, field: "trial2DaySent", type: "TRIAL_2_DAYS" },
  ];

  for (const step of steps) {
    const target = addDays(now, step.days);

    const subscriptions = await tenantSubscriptionModel.find({
      status: "trialing",
      trialEndDate: {
        $gte: startOfDay(target),
        $lte: endOfDay(target),
      },
      [`reminderMeta.${step.field}`]: false,
    });

    for (const sub of subscriptions) {
      await sendReminder(sub, step.type);

      await tenantSubscriptionModel.updateOne(
        { _id: sub._id },
        { $set: { [`reminderMeta.${step.field}`]: true } }
      );
    }
  }
}

//Expired Trials → past_due
async function transitionExpiredTrials(now: Date) {
  await tenantSubscriptionModel.updateMany(
    {
      status: "trialing",
      trialEndDate: { $lt: now },
    },
    {
      $set: {
        status: "past_due",
        graceUntil: addDays(now, GRACE_DAYS),
      },
    }
  );
}

//Expired Active Plans → past_due
async function transitionExpiredPaidPlans(now: Date) {
  await tenantSubscriptionModel.updateMany(
    {
      status: "active",
      currentPeriodEnd: { $lt: now },
    },
    {
      $set: {
        status: "past_due",
        graceUntil: addDays(now, GRACE_DAYS),
      },
    }
  );
}

//Grace Expired → suspended
async function suspendGraceExpired(now: Date) {
  const subs = await tenantSubscriptionModel.find({
    status: "past_due",
    graceUntil: { $lt: now },
  });

  for (const sub of subs) {
    await tenantSubscriptionModel.updateOne(
      { _id: sub._id },
      {
        $set: {
          status: "suspended",
          suspendedAt: now,
        },
      }
    );

    if (!sub.reminderMeta?.graceEndSent) {
      await sendReminder(sub, "ACCOUNT_SUSPENDED");

      await tenantSubscriptionModel.updateOne(
        { _id: sub._id },
        { $set: { "reminderMeta.graceEndSent": true } }
      );
    }
  }
}

//Reminder Sender (Replace with Email Service)
async function sendReminder(
  subscription: ITenantSubscription,
  type: string
) {
  console.log(
    `Sending ${type} to tenant ${subscription.tenantId}`
  );

  // Example:
  // await emailService.send(...)
  // await notificationModel.create(...)
  // await webhookService.trigger(...)
}