import { Schema, model } from "mongoose";
import { ITenantIntegration, EnvironmentType } from "../../types/tenantIntegrationTypes";

export const TenantIntegrationSchema = new Schema<ITenantIntegration>(
  {
    integrationCode:{
      type:String,
      enum:["SAP" ,"AZURE_AD" ,"S3" ,"STRIPE" , "EMAIL_PROVIDER"],
    },

    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    integrationId: {
      type: Schema.Types.ObjectId,
      ref: "Integration",
      required: true,
      index: true,
    },

    templateId: {
      type: Schema.Types.ObjectId,
      ref: "IntegrationTemplate",
      required: true,
      index: true,
    },

    environment: {
      type: String,
      enum: ["dev", "staging", "prod"] as EnvironmentType[],
      default: "prod",
      required: true,
      index: true,
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },

    baseUrl: {
      type: String,
      required: true,
    },

    credentials: {
      type: Schema.Types.Mixed,
      required: true,
    },

    resourceOverrides: {
      type: Schema.Types.Mixed,
      default: {},
    },

    lastSyncedAt: {
      type: Date,
    },
  },
  { timestamps: true, versionKey: false }
);

TenantIntegrationSchema.index(
  { tenantId: 1, integrationId: 1, environment: 1 },
  { unique: true }
);