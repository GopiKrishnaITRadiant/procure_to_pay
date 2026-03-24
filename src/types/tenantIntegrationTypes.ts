import { Types } from "mongoose";


export type IntegrationType =
  | "SAP"
  | "AZURE_AD"
  | "S3"
  | "STRIPE"
  | "EMAIL_PROVIDER";

export type EnvironmentType = "dev" | "staging" | "prod";

export type ApiProtocol = "odata" | "rest";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";


export type EmailProvider =
  | "sendgrid"
  | "ses"
  | "smtp"
  | "microsoft_graph"
  | "gmail_api";

export interface ISendGridCredentials {
  provider: "sendgrid";
  apiKey: string;
}

export interface ISESCredentials {
  provider: "ses";
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export interface ISMTPCredentials {
  provider: "smtp";
  host: string;
  port: number;
  username: string;
  password: string;
  secure?: boolean;
}

export interface IMicrosoftGraphEmailCredentials {
  provider: "microsoft_graph";
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

export interface IGmailApiCredentials {
  provider: "gmail_api";
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export type IEmailProviderCredentials =
  | ISendGridCredentials
  | ISESCredentials
  | ISMTPCredentials
  | IMicrosoftGraphEmailCredentials
  | IGmailApiCredentials;


export type SapResource =
  | "purchase_orders"
  | "purchase_order_items"
  | "vendors"
  | "invoices"
  | "invoice_items"
  | "goods_receipts"
  | "payments";

export interface IFieldMapping {
  externalField: string;
  internalField: string;
}

export interface ISapEndpointOverride {
  serviceName?: string;
  entitySet?: string;
  path?: string;
  method?: HttpMethod;
  expand?: string;
  queryParams?: Record<string, string>;
}

export type SapResourceOverrides = Partial<
  Record<SapResource, Partial<Record<"list" | "get" | "create" | "update" | "delete", ISapEndpointOverride>>>
>;

export interface ISapCredentials {
  username: string;
  password: string;
  sapClient?: string;
}

export interface IAzureAdCredentials {
  clientId: string;
  tenantId: string;
  clientSecret: string;
  redirectUri?: string;
}

export interface IS3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
}

export interface IStripeCredentials {
  secretKey: string;
  webhookSecret?: string;
}

export type IntegrationCredentials =
  | ISapCredentials
  | IAzureAdCredentials
  | IS3Credentials
  | IStripeCredentials
  | IEmailProviderCredentials
  | Record<string, any>;


export interface ITenantIntegration {
  integrationCode:String;
  tenantId: Types.ObjectId;

  integrationId: Types.ObjectId;

  templateId: Types.ObjectId;

  environment: EnvironmentType;

  isEnabled: boolean;

  baseUrl: string;

  credentials: IntegrationCredentials;

  resourceOverrides?: SapResourceOverrides;

  lastSyncedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}