import { Schema, Types } from "mongoose";

export type EnvironmentType = "dev" | "staging" | "prod";

export type SapResource = string;

export type IntegrationCredentials = Record<string, any>;

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface ISapEndpointOverride {
  serviceName?: string;
  entitySet?: string;
  path?: string;
  method?: HttpMethod;
  expand?: string[];
  queryParams?: Record<string, string>;

  enabled?: boolean;
}

export type SapResourceOverrides = Partial<
  Record<
    SapResource,
    {
      enabled?: boolean;
      operations?: Partial<
        Record<
          "list" | "get" | "create" | "update" | "delete",
          ISapEndpointOverride
        >
      >;
    }
  >
>;

export type ResourceSyncMeta = Partial<
  Record<
    SapResource,
    {
      lastSyncedAt?: Date;
      failureCount?: number;
    }
  >
>;

export interface ITenantIntegration {
  _id: Types.ObjectId;

  name?: string;

  tenantId: Types.ObjectId;

  integrationId: Types.ObjectId;

  templateId?: Types.ObjectId;

  environment: EnvironmentType;

  isEnabled: boolean;

  baseUrl?: string;

  credentials: IntegrationCredentials;

  enabledResources?: string[];

  resourceOverrides?: SapResourceOverrides;

  resourceSyncMeta?: ResourceSyncMeta;

  lastSyncedAt?: Date;

  isSyncing?: boolean;
  failureCount?: number;
  syncFrequency?: "5m" | "15m" | "1h" | "daily";

  createdAt: Date;
  updatedAt: Date;
}

export const TenantIntegrationSchema = new Schema<ITenantIntegration>(
  {
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

    name: {
      type: String,
      trim: true,
    },

    environment: {
      type: String,
      enum: ["dev", "staging", "prod"],
      default: "prod",
      required: true,
      index: true,
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },

    templateId: {
      type: Schema.Types.ObjectId,
      ref: "IntegrationTemplate",
    },

    baseUrl: {
      type: String,
      trim: true,
    },

    credentials: {
      type: Schema.Types.Mixed,
      required: true,
    },

    enabledResources: {
      type: [String],
      default: [],
    },

    resourceOverrides: {
      type: Schema.Types.Mixed,
      default: {},
    },

    resourceSyncMeta: {
      type: Schema.Types.Mixed,
      default: {},
    },

    lastSyncedAt: {
      type: Date,
    },

    isSyncing: {
      type: Boolean,
      default: false,
      index: true,
    },

    failureCount: {
      type: Number,
      default: 0,
    },

    syncFrequency: {
      type: String,
      enum: ["5m", "15m", "1h", "daily"],
      default: "15m",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);
