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
  rfqItemId?: Types.ObjectId;
  quotationId?: Types.ObjectId;
  contractId?: Types.ObjectId;

  // SAP specific
  externalId?: string; // SAP PO Number
}

export interface IPurchaseOrder {
  _id: Types.ObjectId;

  tenantId: Types.ObjectId;
  vendorId: Types.ObjectId;
  rfqId?: Types.ObjectId;

  //Integration reference
  externalId?: string; // SAP PO ID

  purchaseOrderNumber: string;
  purchaseOrderType: string; // NB, ZNB

  companyCode: string;
  purchasingOrganization: string;
  purchasingGroup?: string;

  supplierName: string;

  creationDate: Date;
  purchaseOrderDate: Date;
  lastChangeDateTime?: Date;

  paymentTerms?: string;
  incoterms?: string;

  currency: string;
  exchangeRate?: number;

  pricingProcedure?: string;

  status:
    | "CREATED"
    | "SENT"
    | "ACKNOWLEDGED"
    | "PARTIALLY_RECEIVED"
    | "RECEIVED"
    | "COMPLETED"
    | "CANCELLED";

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

    // ✅ ADD THESE (CRITICAL)
    rfqId: { type: Types.ObjectId, ref: "RFQ", index: true },
    rfqItemId: { type: Types.ObjectId, index: true },
    quotationId: { type: Types.ObjectId, ref: "Quotation", index: true },

    // Optional future
    requisitionId: { type: Types.ObjectId },
    contractId: { type: Types.ObjectId },

    externalId: { type: String }, // SAP item id if needed
  },
  { _id: true },
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

    //  use vendorId instead of string
    vendorId: {
      type: Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    // Optional display field
    supplierName: { type: String },

    rfqId: { type: Types.ObjectId, ref: "RFQ", index: true },

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
      enum: [
        "CREATED",
        "SENT",
        "ACKNOWLEDGED",
        "PARTIALLY_RECEIVED",
        "RECEIVED",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "CREATED",
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
      default: "RFQ",
    },

    syncStatus: {
      type: String,
      enum: ["SYNCED", "PENDING", "FAILED"],
      default: "PENDING",
    },

    lastSyncedAt: { type: Date },

    createdBy: { type: Schema.Types.ObjectId },
    updatedBy: { type: Schema.Types.ObjectId },
  },
  { timestamps: true, versionKey: false },
);
PurchaseOrderSchema.index({ rfqId: 1, tenantId: 1 });
PurchaseOrderSchema.index(
  { rfqId: 1, vendorId: 1, tenantId: 1 },
  { unique: true }
);