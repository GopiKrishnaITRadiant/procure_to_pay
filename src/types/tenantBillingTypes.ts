import { Types } from "mongoose";

export interface ITenantBilling {
  tenantId: Types.ObjectId;

  billingEmail: string;

  billingContactName?: string;
  paymentCustomerId:string;

  billingContactPhone?: {
    countryCode?: string;
    number?: string;
  };

  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };

  currency?: string;

  paymentTermsDays?: number;

  taxId?: string;

  billingCycle?: "monthly" | "yearly";

  invoicePrefix?: string;

  billingProvider?: "stripe" | "razorpay" | "manual";

  createdAt: Date;
  updatedAt: Date;
}