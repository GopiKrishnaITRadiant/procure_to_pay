import planModel from "../../src/models/planModel";

export const seedPlans = async () => {
  try {
    const plans = [
      {
        planCode: "FREE",
        displayName: "Free",
        description: "Starter plan for small businesses",
        pricing: [
          { currency: "USD", amount: 0, billingCycle: "monthly" },
          { currency: "INR", amount: 0, billingCycle: "monthly" },
        ],
        features: {
          poModule: true,
          sapIntegration: false,
          vendorPortal: false,
          apiAccess: false,
          advancedAnalytics: false,
        },
        limits: {
          maxUsers: 3,
          maxVendors: 50,
          maxStorageMB: 500,
        },
        trialDays: 14,
        isActive: true,
        isPublic: true,
      },
      {
        planCode: "BASIC",
        displayName: "Basic",
        description: "Perfect for growing teams",
        pricing: [
          { currency: "USD", amount: 29, billingCycle: "monthly" },
          { currency: "INR", amount: 1999, billingCycle: "monthly" },
        ],
        features: {
          poModule: true,
          sapIntegration: false,
          vendorPortal: true,
          apiAccess: true,
          advancedAnalytics: false,
        },
        limits: {
          maxUsers: 10,
          maxVendors: 500,
          maxStorageMB: 5000,
        },
        trialDays: 14,
        isActive: true,
        isPublic: true,
      },
      {
        planCode: "STANDARD",
        displayName: "Standard",
        description: "Advanced tools for scaling businesses",
        pricing: [
          { currency: "USD", amount: 79, billingCycle: "monthly" },
          { currency: "INR", amount: 5999, billingCycle: "monthly" },
        ],
        features: {
          poModule: true,
          sapIntegration: true,
          vendorPortal: true,
          apiAccess: true,
          advancedAnalytics: true,
        },
        limits: {
          maxUsers: 50,
          maxVendors: 2000,
          maxStorageMB: 20000,
        },
        trialDays: 14,
        isActive: true,
        isPublic: true,
      },
      {
        planCode: "PREMIUM",
        displayName: "Premium",
        description: "Enterprise-grade capabilities",
        pricing: [
          { currency: "USD", amount: 199, billingCycle: "monthly" },
          { currency: "INR", amount: 14999, billingCycle: "monthly" },
        ],
        features: {
          poModule: true,
          sapIntegration: true,
          vendorPortal: true,
          apiAccess: true,
          advancedAnalytics: true,
        },
        limits: {
          maxUsers: 200,
          maxVendors: 10000,
          maxStorageMB: 100000,
        },
        trialDays: 30,
        isActive: true,
        isPublic: true,
      },
      {
        planCode: "ENTERPRISE",
        displayName: "Enterprise",
        description: "Custom plan with unlimited scaling",
        pricing: [
          { currency: "USD", amount: 1999, billingCycle: "yearly" },
          { currency: "INR", amount: 149999, billingCycle: "yearly" },
        ],
        features: {
          poModule: true,
          sapIntegration: true,
          vendorPortal: true,
          apiAccess: true,
          advancedAnalytics: true,
        },
        limits: {
          maxUsers: 999999,
          maxVendors: 999999,
          maxStorageMB: 999999,
        },
        trialDays: 30,
        isActive: true,
        isPublic: true,
      },
    ];

    for (const plan of plans) {
      await planModel.updateOne(
        { planCode: plan.planCode },
        { $set: plan },
        { upsert: true }
      );
    }

    console.log("Subscription plans seeded successfully");
  } catch (error) {
    console.error("Error seeding subscriptions:", error);
  }
};