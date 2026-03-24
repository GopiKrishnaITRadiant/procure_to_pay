import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { sendResponse } from "../utils/sendResponse";
import { ITenantSubscription, tenantSubscriptionModel } from "../models/tenantSubscriptionModel";

export const createTenantSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      tenantId,
      planId,
      startDate,
      status = 'active',
      autoRenew = true,
    }: ITenantSubscription = req.body;

    const tenantSubscription = await tenantSubscriptionModel.create({
      tenantId,
      planId,
      startDate,
      status,
      autoRenew,
    });

    await tenantSubscription.save();
    
    sendResponse({res, statusCode: 201, message: "Tenant Subscription created successfully", data: tenantSubscription});
  } catch (error) {
    next(error);
  }
};

export const getTenantSubscriptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, subscriptionId } = req.query;

    const query: any = {};
    if (tenantId) query.tenantId = tenantId;
    if (subscriptionId) query.subscriptionId = subscriptionId;

    const tenantSubscriptions = await tenantSubscriptionModel.find(query).exec();
    
    sendResponse({res, statusCode: 200, message: "Tenant Subscriptions fetched successfully", data: tenantSubscriptions});
  } catch (error) {
    next(error);
  }
};

export const updateTenantSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData: Partial<ITenantSubscription> = req.body;

    const tenantSubscription = await tenantSubscriptionModel.findByIdAndUpdate(id, updateData, { new: true }).exec();

    if (!tenantSubscription) {
      return sendResponse({res, statusCode: 404, message: `Tenant Subscription with ID ${id} not found`});
    }

    sendResponse({res, statusCode: 200, message: "Tenant Subscription updated successfully", data: tenantSubscription});
  } catch (error) {
    next(error);
  }
};

export const deleteTenantSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const tenantSubscription = await tenantSubscriptionModel.findById(id);

    if (!tenantSubscription) {
      return sendResponse({res, statusCode: 404, message: `Tenant Subscription with ID ${id} not found`});
    }

    sendResponse({res, statusCode: 200, message: "Tenant Subscription deleted successfully", data: tenantSubscription});
  } catch (error) {
    next(error);
  }
};