import { Schema, Types, Document } from "mongoose";

export interface IPurchaseOrderItem {
  _id: Types.ObjectId;

  itemNumber: string; // "10", "20" (SAP style)
  material?: string;
  description?: string;

  quantity: number;
  unitOfMeasure: string;

  netPrice: number;
  currency: string;

  deliveryDate?: Date;

  plant?: string;
  storageLocation?: string;

  accountAssignmentCategory?: string; // K, F, etc.
  purchaseOrderItemCategory?: string; // Standard, Service

  status: "OPEN" | "PARTIALLY_RECEIVED" | "RECEIVED" | "INVOICED";

  receivedQuantity?: number;
  invoicedQuantity?: number;
  requisitionId?: Types.ObjectId;
  rfqId?: Types.ObjectId;
  quotationId?: Types.ObjectId;
  contractId?: Types.ObjectId;

  // SAP specific
  externalId?: string; // SAP PO Number
}

export interface IPurchaseOrder extends Document {
  _id: Types.ObjectId;

  tenantId: Types.ObjectId;

  //Integration reference
  externalId?: string; // SAP PO ID

  purchaseOrderNumber: string;
  purchaseOrderType: string; // NB, ZNB

  companyCode: string;
  purchasingOrganization: string;
  purchasingGroup?: string;

  supplier: string;

  creationDate: Date;
  purchaseOrderDate: Date;
  lastChangeDateTime?: Date;

  paymentTerms?: string;
  incoterms?: string;

  currency: string;
  exchangeRate?: number;

  pricingProcedure?: string;

  status: "OPEN" | "PARTIALLY_RECEIVED" | "RECEIVED" | "COMPLETED" | "CANCELLED";

  totalNetAmount?: number;

  items: IPurchaseOrderItem[];

  source: "SAP" | "DIRECT" | "RFQ" | "CONTRACT";
  syncStatus?: "SYNCED" | "PENDING" | "FAILED";
  lastSyncedAt?: Date;

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrderItemSchema = new Schema<IPurchaseOrderItem>(
  {
    itemNumber: { type: String, required: true },

    material: { type: String, index: true },
    description: { type: String },

    quantity: { type: Number, required: true },
    unitOfMeasure: { type: String, required: true },

    netPrice: { type: Number, required: true },
    currency: { type: String, required: true },

    deliveryDate: { type: Date },

    plant: { type: String, index: true },
    storageLocation: { type: String },

    accountAssignmentCategory: { type: String },
    purchaseOrderItemCategory: { type: String },

    status: {
      type: String,
      enum: ["OPEN", "PARTIALLY_RECEIVED", "RECEIVED", "INVOICED"],
      default: "OPEN",
      index: true,
    },

    receivedQuantity: { type: Number, default: 0 },
    invoicedQuantity: { type: Number, default: 0 },
  },
  { _id: true }
);

export const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    externalId: { type: String, index: true },

    purchaseOrderNumber: {
      type: String,
      required: true,
    },

    purchaseOrderType: { type: String, required: true },

    companyCode: { type: String, required: true, index: true },
    purchasingOrganization: { type: String, required: true },
    purchasingGroup: { type: String },

    supplier: { type: String, required: true, index: true },

    creationDate: { type: Date, required: true },
    purchaseOrderDate: { type: Date, required: true },
    lastChangeDateTime: { type: Date },

    paymentTerms: { type: String },
    incoterms: { type: String },

    currency: { type: String, required: true },
    exchangeRate: { type: Number, default: 1 },

    pricingProcedure: { type: String },

    status: {
      type: String,
      enum: ["OPEN", "PARTIALLY_RECEIVED", "RECEIVED", "COMPLETED", "CANCELLED"],
      default: "OPEN",
      index: true,
    },

    totalNetAmount: { type: Number },

    items: {
      type: [PurchaseOrderItemSchema],
      default: [],
    },

    source: {
      type: String,
      enum: ["SAP", "DIRECT", "RFQ", "CONTRACT"],
      default: "SAP",
    },

    syncStatus: {
      type: String,
      enum: ["SYNCED", "PENDING", "FAILED"],
      default: "SYNCED",
    },

    lastSyncedAt: { type: Date },

    createdBy: { type: Schema.Types.ObjectId },
    updatedBy: { type: Schema.Types.ObjectId },
  },
  { timestamps: true, versionKey:false }
);

PurchaseOrderSchema.index(
  { tenantId: 1, purchaseOrderNumber: 1 },
  { unique: true }
);

PurchaseOrderSchema.index({ supplier: 1, tenantId: 1 });
PurchaseOrderSchema.index({ status: 1, tenantId: 1 });
PurchaseOrderSchema.index({ creationDate: -1 });