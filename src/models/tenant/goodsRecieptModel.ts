import { Schema, Types, InferSchemaType } from "mongoose";

export enum GoodsReceiptStatus {
  CREATED = "CREATED",
  PARTIAL = "PARTIAL",
  FULL = "FULL",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export interface IGoodsReceiptItem {
  _id?: Types.ObjectId;

  purchaseOrderItemId: Types.ObjectId;

  /**
   * SAP style item number: 10,20,30
   */
  itemNumber: string;

  /**
   * Material / item details copied from PO snapshot
   */
  material?: string;
  description?: string;

  orderedQuantity: number;
  previouslyReceivedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  pendingQuantity: number;

  unitOfMeasure: string;
  plant?: string;
  storageLocation?: string;

  status: "PARTIAL" | "FULL" | "REJECTED";

  remarks?: string;

  requisitionId?: Types.ObjectId;
  rfqId?: Types.ObjectId;
//   rfqItemId?: Types.ObjectId;
  quotationId?: Types.ObjectId;
  contractId?: Types.ObjectId;

  /**
   * External ERP line ref
   */
  externalId?: string;
}

export interface IGoodsReceipt {
  _id: Types.ObjectId;

  tenantId: Types.ObjectId;

  /**
   * External ERP GRN Number / SAP Material Document
   */
  externalId?: string;

  grnNumber: string;

  purchaseOrderId: Types.ObjectId;
  purchaseOrderNumber: string;

  vendorId: Types.ObjectId;
  supplierName?: string;

  companyCode: string;
  purchasingOrganization: string;
  purchasingGroup?: string;

  currency: string;

  items: IGoodsReceiptItem[];

  totalReceivedQuantity: number;
  totalAcceptedQuantity: number;
  totalRejectedQuantity: number;

  receivedDate: Date;

  status: GoodsReceiptStatus;

  source: "SAP" | "DIRECT" | "PORTAL";

  syncStatus?: "SYNCED" | "PENDING" | "FAILED";
  lastSyncedAt?: Date;

  remarks?: string;

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/*                              ITEM SUB SCHEMA                               */
/* -------------------------------------------------------------------------- */

const GoodsReceiptItemSchema = new Schema<IGoodsReceiptItem>(
  {
    purchaseOrderItemId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    itemNumber: {
      type: String,
      required: true,
      trim: true,
    },

    material: {
      type: String,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    orderedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    previouslyReceivedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    receivedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    acceptedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    rejectedQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    pendingQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    unitOfMeasure: {
      type: String,
      required: true,
      trim: true,
    },

    plant: {
      type: String,
      trim: true,
      index: true,
    },

    storageLocation: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["PARTIAL", "FULL", "REJECTED"],
      required: true,
      default: "PARTIAL",
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    requisitionId: {
      type: Schema.Types.ObjectId,
      index: true,
    },

    rfqId: {
      type: Schema.Types.ObjectId,
      ref: "RFQ",
      index: true,
    },

    quotationId: {
      type: Schema.Types.ObjectId,
      ref: "Quotation",
      index: true,
    },

    contractId: {
      type: Schema.Types.ObjectId,
      index: true,
    },

    externalId: {
      type: String,
      trim: true,
    },
  },
  {
    _id: true,
  }
);

export const GoodsReceiptSchema = new Schema<IGoodsReceipt>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    externalId: {
      type: String,
      index: true,
    },

    grnNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    purchaseOrderId: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
      index: true,
    },

    purchaseOrderNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },

    supplierName: {
      type: String,
      trim: true,
    },

    companyCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    purchasingOrganization: {
      type: String,
      required: true,
      trim: true,
    },

    purchasingGroup: {
      type: String,
      trim: true,
    },

    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    items: {
      type: [GoodsReceiptItemSchema],
      required: true,
      validate: {
        validator: (value: IGoodsReceiptItem[]) =>
          Array.isArray(value) && value.length > 0,
        message: "At least one item is required",
      },
    },

    totalReceivedQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    totalAcceptedQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    totalRejectedQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    receivedDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(GoodsReceiptStatus),
      default: GoodsReceiptStatus.CREATED,
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: ["SAP", "DIRECT", "PORTAL"],
      default: "DIRECT",
      required: true,
    },

    syncStatus: {
      type: String,
      enum: ["SYNCED", "PENDING", "FAILED"],
      default: "PENDING",
      index: true,
    },

    lastSyncedAt: {
      type: Date,
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

GoodsReceiptSchema.index(
  { tenantId: 1, grnNumber: 1 },
  { unique: true }
);

GoodsReceiptSchema.index({
  tenantId: 1,
  purchaseOrderId: 1,
  createdAt: -1,
});

GoodsReceiptSchema.index({
  tenantId: 1,
  vendorId: 1,
  createdAt: -1,
});

GoodsReceiptSchema.index({
  tenantId: 1,
  status: 1,
  createdAt: -1,
});

GoodsReceiptSchema.index({
  tenantId: 1,
  syncStatus: 1,
});

/* -------------------------------------------------------------------------- */
/*                            AUTO TOTAL CALCULATION                          */
/* -------------------------------------------------------------------------- */

// GoodsReceiptSchema.pre("validate", function (next) {
//   const doc = this as any;

//   let totalReceived = 0;
//   let totalAccepted = 0;
//   let totalRejected = 0;

//   for (const item of doc.items || []) {
//     if (
//       item.acceptedQuantity + item.rejectedQuantity !==
//       item.receivedQuantity
//     ) {
//       return next(
//         new Error(
//           `Accepted + Rejected must equal Received for item ${item.itemNumber}`
//         )
//       );
//     }

//     totalReceived += item.receivedQuantity;
//     totalAccepted += item.acceptedQuantity;
//     totalRejected += item.rejectedQuantity;
//   }

//   doc.totalReceivedQuantity = totalReceived;
//   doc.totalAcceptedQuantity = totalAccepted;
//   doc.totalRejectedQuantity = totalRejected;

//   next();
// });

export type GoodsReceiptDocument = InferSchemaType<
  typeof GoodsReceiptSchema
>;