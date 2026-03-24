import { ITenantSubscription, tenantSubscriptionModel } from "../models/tenantSubscriptionModel";
import { ApiError } from "../utils/apiErrors";

export type AccessState =
  | "active"
  | "grace"
  | "restricted"
  | "blocked";

export function resolveAccessState(subscription: ITenantSubscription): AccessState {
  const now = new Date();

  if (!subscription) return "blocked";

  if (subscription.status === "suspended" || subscription.status === "cancelled") {
    return "blocked";
  }

  if (subscription.status === "past_due") {
    if (subscription.graceUntil && subscription.graceUntil > now) {
      return "grace";
    }
    return "blocked";
  }

  if (subscription.status === "trialing" || subscription.status === "active") {
    return "active";
  }

  return "blocked";
}

export const planMiddleware = async (
  req: any,
  res: any,
  next: any
) => {
  const tenantId = req.user?.tenantId||null;

  const subscription = await tenantSubscriptionModel
    .findOne({ tenantId })
    .lean();

  if(!subscription){
    throw new ApiError(404,"subscription not found")
  }

  const accessState = resolveAccessState(subscription);

  //need to update active to blocked for testing using active
  if (accessState === "blocked") {
    return res.status(403).json({
      message: "Subscription expired",
      code: "SUBSCRIPTION_BLOCKED",
    });
  }

  // Attach to request for downstream usage
  req.subscription = subscription;
  req.accessState = accessState;

  next();
};