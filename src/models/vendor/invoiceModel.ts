import { Schema, Types, InferSchemaType } from "mongoose";

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  PENDING_MATCH = "PENDING_MATCH",
  MATCHED = "MATCHED",
  MISMATCH = "MISMATCH",
  APPROVED = "APPROVED",
  PARTIALLY_PAID = "PARTIALLY_PAID",
  PAID = "PAID",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export enum MatchStatus {
  NOT_STARTED = "NOT_STARTED",
  MATCHED = "MATCHED",
  PRICE_MISMATCH = "PRICE_MISMATCH",
  QUANTITY_MISMATCH = "QUANTITY_MISMATCH",
  TAX_MISMATCH = "TAX_MISMATCH",
  MULTIPLE_MISMATCH = "MULTIPLE_MISMATCH",
}

export enum InvoiceSource {
  PORTAL = "PORTAL",
  MANUAL = "MANUAL",
  OCR = "OCR",
  SAP = "SAP",
}

export interface IInvoiceItem {
  _id?: Types.ObjectId;

  /**
   * PO item reference
   */
  purchaseOrderItemId: Types.ObjectId;

  /**
   * Optional GRN line reference
   */
  goodsReceiptItemId?: Types.ObjectId;

  itemNumber: string;

  material?: string;
  description?: string;

  orderedQuantity: number;
  receivedQuantity: number;
  previouslyInvoicedQuantity: number;
  invoicedQuantity: number;
  pendingInvoiceQuantity: number;

  unitOfMeasure: string;

  purchaseOrderUnitPrice: number;
  invoiceUnitPrice: number;

  lineSubTotal: number;

  taxRate?: number;
  taxAmount: number;

  lineGrandTotal: number;

  matchStatus: MatchStatus;
  mismatchReason?: string;

  remarks?: string;

  rfqId?: Types.ObjectId;
  rfqItemId?: Types.ObjectId;
  quotationId?: Types.ObjectId;
  requisitionId?: Types.ObjectId;
  contractId?: Types.ObjectId;

  externalId?: string;
}

export interface IInvoice {
  _id: Types.ObjectId;

  tenantId: Types.ObjectId;

  /**
   * Supplier invoice number
   */
  vendorInvoiceNumber: string;

  /**
   * Internal invoice number
   */
  invoiceNumber: string;

  purchaseOrderId: Types.ObjectId;
  purchaseOrderNumber: string;

  goodsReceiptIds?: Types.ObjectId[];

  vendorId: Types.ObjectId;
  supplierName?: string;

  companyCode: string;
  purchasingOrganization: string;
  purchasingGroup?: string;

  quotationId?: Types.ObjectId;

  items: IInvoiceItem[];

  subtotal: number;
  taxAmount: number;
  grandTotal: number;

  paidAmount: number;
  dueAmount: number;

  currency: string;
  exchangeRate?: number;

  invoiceDate: Date;
  postingDate?: Date;
  dueDate: Date;

  status: InvoiceStatus;
  matchStatus: MatchStatus;

  source: InvoiceSource;

  attachments?: string[];

  paymentTerms?: string;
  remarks?: string;

  approvedAt?: Date;
  approvedBy?: Types.ObjectId;

  rejectedAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectionReason?: string;

  syncStatus?: "SYNCED" | "PENDING" | "FAILED";
  lastSyncedAt?: Date;
  externalId?: string;

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>(
  {
    purchaseOrderItemId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    goodsReceiptItemId: {
      type: Schema.Types.ObjectId,
      default: null,
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

    receivedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    previouslyInvoicedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    invoicedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    pendingInvoiceQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    unitOfMeasure: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    purchaseOrderUnitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    invoiceUnitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    lineSubTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    taxRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lineGrandTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    matchStatus: {
      type: String,
      enum: Object.values(MatchStatus),
      default: MatchStatus.NOT_STARTED,
      index: true,
    },

    mismatchReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    rfqId: { type: Schema.Types.ObjectId },
    rfqItemId: { type: Schema.Types.ObjectId },
    quotationId: { type: Schema.Types.ObjectId },
    requisitionId: { type: Schema.Types.ObjectId },
    contractId: { type: Schema.Types.ObjectId },

    externalId: { type: String },
  },
  {
    _id: true,
  }
);

export const InvoiceSchema = new Schema<IInvoice>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    vendorInvoiceNumber: {
      type: String,
      // required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    invoiceNumber: {
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

    goodsReceiptIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "GoodsReceipt",
      },
    ],

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

    quotationId: {
      type: Schema.Types.ObjectId,
      ref: "Quotation",
      index: true,
    },

    items: {
      type: [InvoiceItemSchema],
      validate: {
        validator: (value: IInvoiceItem[]) =>
          Array.isArray(value) && value.length > 0,
        message: "At least one item is required",
      },
      required: true,
    },

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },

    grandTotal: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    dueAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    exchangeRate: {
      type: Number,
      default: 1,
      min: 0,
    },

    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    postingDate: {
      type: Date,
    },

    dueDate: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.DRAFT,
      index: true,
    },

    matchStatus: {
      type: String,
      enum: Object.values(MatchStatus),
      default: MatchStatus.NOT_STARTED,
      index: true,
    },

    source: {
      type: String,
      enum: Object.values(InvoiceSource),
      default: InvoiceSource.MANUAL,
    },

    attachments: {
      type: [String],
      default: [],
    },

    paymentTerms: {
      type: String,
      trim: true,
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    approvedAt: Date,

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    rejectedAt: Date,

    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    syncStatus: {
      type: String,
      enum: ["SYNCED", "PENDING", "FAILED"],
      default: "PENDING",
    },

    lastSyncedAt: Date,

    externalId: String,

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

InvoiceSchema.index(
  { tenantId: 1, invoiceNumber: 1 },
  { unique: true }
);

InvoiceSchema.index(
  { tenantId: 1, vendorId: 1, vendorInvoiceNumber: 1 },
  { unique: true }
);

InvoiceSchema.index({
  tenantId: 1,
  purchaseOrderId: 1,
  createdAt: -1,
});

InvoiceSchema.index({
  tenantId: 1,
  status: 1,
  dueDate: 1,
});

InvoiceSchema.index({
  tenantId: 1,
  matchStatus: 1,
});

/* -------------------------------------------------------------------------- */
/*                             AUTO CALCULATIONS                              */
/* -------------------------------------------------------------------------- */

// InvoiceSchema.pre("validate", function (next) {
//   const doc = this as any;

//   let subtotal = 0;
//   let taxTotal = 0;

//   for (const item of doc.items || []) {
//     if (
//       item.invoicedQuantity >
//       item.receivedQuantity
//     ) {
//       return next(
//         new Error(
//           `Invoiced quantity cannot exceed received quantity for item ${item.itemNumber}`
//         )
//       );
//     }

//     const lineSubTotal =
//       item.invoicedQuantity *
//       item.invoiceUnitPrice;

//     const taxAmount =
//       (lineSubTotal *
//         (item.taxRate || 0)) /
//       100;

//     item.lineSubTotal =
//       lineSubTotal;

//     item.taxAmount = taxAmount;

//     item.lineGrandTotal =
//       lineSubTotal + taxAmount;

//     subtotal += lineSubTotal;
//     taxTotal += taxAmount;
//   }

//   doc.subtotal = subtotal;
//   doc.taxAmount = taxTotal;
//   doc.grandTotal =
//     subtotal + taxTotal;

//   doc.dueAmount =
//     doc.grandTotal -
//     (doc.paidAmount || 0);

//   if (
//     doc.paidAmount >=
//       doc.grandTotal &&
//     doc.grandTotal > 0
//   ) {
//     doc.status =
//       InvoiceStatus.PAID;
//   } else if (
//     doc.paidAmount > 0
//   ) {
//     doc.status =
//       InvoiceStatus.PARTIALLY_PAID;
//   }

//   next();
// });

export type InvoiceDocument =
  InferSchemaType<
    typeof InvoiceSchema
  >;