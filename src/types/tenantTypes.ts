import {Types,} from "mongoose";

export interface ITenant {
  _id: Types.ObjectId;

  name: string;
  legalName: string;
  about?: string;
  logo?: string;

  domain: string;
  companyCode: string;
  orgEmail: string;
  phone?: {
    countryCode:String,
    number:String,
  };
  website?: string;

  taxId?: string;
  registrationNumber?: string;
  industry?: string;

  address: {
    street: string;
    landmark?: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  };

  dbName: string;
  baseCurrency: string;

  features: {
    poModule: boolean;
    rfq: boolean;
    contract: boolean;
    vendorPortal: boolean;
    directPO: boolean;
    uomCustomization: boolean;
    uomMapping: boolean;
    exchangeRateOverride: boolean;
  },

  procurementMode: "INTERNAL" | "SAP" | "HYBRID",

  integrations: {
    sap: {
      enabled: boolean;
    }
  }

  limits: {
    maxUsers: number;
    maxVendors: number;
    maxStorageMB: number;
  };

  security: {
    enforceMFA: boolean;
    passwordExpiryDays?: number;
    allowedIpRanges?: string[];
  };

  status: "provisioning" | "active" | "failed";
  hasSAPIntegration: boolean;
  isSuspended: boolean;
  activatedAt?: Date;
  suspendedAt?: Date;

  metrics?: {
    userCount?: number;
    vendorCount?: number;
    storageUsedMB?: number;
    lastActivityAt?: Date;
  };

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}