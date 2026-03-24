import subscriptionModel from "../models/planModel";

export const getSubscriptionByCode=async(planCode:string):Promise<any>=>{
    return await subscriptionModel.findOne({planCode})
}