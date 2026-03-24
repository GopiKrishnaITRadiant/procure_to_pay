import { getSubscriptionByCode } from "../services/getSubscriptionConfig";

export const featureMiddleware = (featureKey: string) => {
  return async (req: any, res: any, next: any) => {
    const subscription = req.subscription;

    const plan = await getSubscriptionByCode(subscription.planCode);
    
    if (!plan?.features[featureKey]) {
      return res.status(403).json({
        message: "Feature not available in your plan",
        code: "FEATURE_NOT_ALLOWED",
      });
    }

    next();
  };
};