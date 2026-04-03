import { Schema, model, Types, Document } from "mongoose";


export type ApiProtocol = "odata" | "rest";

export type ODataVersion = "v4" | "v2"| undefined;

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type ResourceOperation =
  | "list"
  | "get"
  | "create"
  | "update"
  | "delete";

export interface IEndpointConfig {
  operation: ResourceOperation;

  method: HttpMethod;

  entitySet?: string;

  path?: string;

  expand?: string[];

  queryParams?: Record<string, string | string[]>;

  isEnabled: boolean;
}

const EndpointConfigSchema = new Schema<IEndpointConfig>(
  {
    operation: {
      type: String,
      enum: ["list", "get", "create", "update", "delete"],
      required: true,
    },

    method: {
      type: String,
      enum: ["GET", "POST", "PATCH", "PUT", "DELETE"],
      default: "GET",
    },

    entitySet: { type: String },

    path: { type: String },

    expand: [{ type: String }],

    queryParams: {
      type: Map,
      of: Schema.Types.Mixed,
    },

    isEnabled: { type: Boolean, default: true },
  },
  { _id: false, versionKey:false }
);


export interface IResourceConfig {
  serviceName: string;

  keys?: string[];

  endpoints: IEndpointConfig[];
}

const ResourceConfigSchema = new Schema<IResourceConfig>(
  {
    serviceName: { type: String },

    keys: [{ type: String }],

    endpoints: [EndpointConfigSchema],
  },
  { _id: false }
);


export interface IFieldMapping {
  externalField: string;
  internalField: string;
}

const FieldMappingSchema = new Schema<IFieldMapping>(
  {
    externalField: { type: String, required: true },

    internalField: { type: String, required: true },
  },
  { _id: false }
);


export interface IIntegrationTemplate extends Document {
  _id: Types.ObjectId;

  integrationId: Types.ObjectId;

  name: string;

  version: string;

  protocol: ApiProtocol;

  odataVersion?: ODataVersion;

  resources: Map<string, IResourceConfig>;

  fieldMappings?: Map<string, IFieldMapping[]>;

  isActive: boolean;
}

const IntegrationTemplateSchema = new Schema<IIntegrationTemplate>(
  {
    integrationId: {
      type: Types.ObjectId,
      ref: "Integration",
      required: true,
      index: true,
    },

    name: {
      type: String,
      trim: true,
    },

    version: {
      type: String,
      required: true,
    },

    protocol: {
      type: String,
      enum: ["odata", "rest"],
      required: true,
    },

    odataVersion: {
      type: String,
      enum: ["v4", "v2"],
      default: undefined,
    },

    resources: {
      type: Map,
      of: ResourceConfigSchema,
    },

    fieldMappings: {
      type: Map,
      of: [FieldMappingSchema],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const IntegrationTemplateModel = model<IIntegrationTemplate>(
  "IntegrationTemplate",
  IntegrationTemplateSchema
);