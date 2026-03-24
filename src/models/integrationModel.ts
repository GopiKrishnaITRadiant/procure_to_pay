import { Types,Schema, model } from "mongoose";

export interface IIntegration {
  _id: Types.ObjectId;

  name: string;
  code: "SAP" | "AZURE_AD" | "S3" | "STRIPE" | "EMAIL_PROVIDER";

  category: "ERP" | "AUTH" | "PAYMENT" | "STORAGE" | "COMMUNICATION";

  description?: string;

  capabilities: {
    supportsWebhook: boolean,
    supportsPolling: boolean,
    supportsOAuth: boolean
  },
  supportedProtocols?: ("odata" | "rest" )[];

  isActive: boolean;

  supportedEnvironments: ("dev" | "staging" | "prod")[];

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

    category: {
      type: String,
      enum: ["ERP", "AUTH", "PAYMENT", "STORAGE", "COMMUNICATION"],
      required: true,
    },

    description: {
      type: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    supportedEnvironments: {
      type: [String],
      enum: ["dev", "staging", "prod"],
      default: ["prod"],
    },
    capabilities:{
      supportsWebhook:{ type:Boolean, default:false},
      supportsPolling:{ type:Boolean, default:true},
      supportsOAuth:{ type:Boolean, default:false}
    }
  },
  { timestamps: true, versionKey: false }
);

export const integrationModel = model<IIntegration>(
  "Integration",
  IntegrationSchema
);