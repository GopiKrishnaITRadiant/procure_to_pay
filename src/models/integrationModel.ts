import { Schema, model, Types } from "mongoose";

export type IntegrationMode =
  | "TEMPLATE_BASED"
  | "SDK_BASED";

export type CredentialField = {
  required?: boolean;
  encrypted?: boolean;
  type?: "string" | "number" | "boolean";
  default?: any;
};

export type CredentialSchemaType = Record<string, CredentialField>;

export interface IIntegration {
  _id: Types.ObjectId;

  name: string;

  code: string;

  mode: IntegrationMode;

  description?: string;

  capabilities: {
    supportsWebhook: boolean;
    supportsPolling: boolean;
    supportsOAuth: boolean;
  };

  supportedProtocols?: ("odata" | "rest")[];

  credentialSchema?: CredentialSchemaType;

  supportedEnvironments: ("dev" | "staging" | "prod")[];

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const IntegrationSchema = new Schema<IIntegration>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
      uppercase: true,
      unique: true,
      index: true,
    },

    mode: {
      type: String,
      enum: ["TEMPLATE_BASED", "SDK_BASED"],
      required: true,
    },

    description: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    supportedProtocols: {
      type: [String],
      enum: ["odata", "rest"],
      default: ["odata"],
    },

    credentialSchema: {
      type: Schema.Types.Mixed,
      default: null,
    },

    supportedEnvironments: {
      type: [String],
      enum: ["dev", "staging", "prod"],
      default: ["prod"],
    },

    capabilities: {
      supportsWebhook: { type: Boolean, default: false },
      supportsPolling: { type: Boolean, default: true },
      supportsOAuth: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const integrationModel = model<IIntegration>(
  "Integration",
  IntegrationSchema
);