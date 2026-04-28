import { Schema, model } from "mongoose";

//making global interface
export interface IAuditLog {
    _id: Schema.Types.ObjectId;
    tenantId: Schema.Types.ObjectId;
    module: string;
    documentId: Schema.Types.ObjectId;
    documentNumber: string;
    action: string;
    severity: string;
    source: string;
    performedBy: Schema.Types.ObjectId;
    requestId: string;
    changes: { field: string; oldValue: any; newValue: any }[];
    metadata: { before: any; after: any };
    remarks: string;
    ipAddress: string;
    userAgent: string;
    createdAt: Date;
    updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    module: {
      type: String,
      required: true,
      enum: [
        "USER",
        "VENDOR",
        "REQUISITION",
        "RFQ",
        "QUOTATION",
        "PO",
        "GRN",
        "INVOICE",
        "PAYMENT",
        "BUDGET",
        "SETTINGS",
      ],
      index: true,
    },

    documentId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    documentNumber: {
      type: String,
      trim: true,
      index: true,
    },

    action: {
      type: String,
      required: true,
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "APPROVE",
        "REJECT",
        "CANCEL",
        "LOGIN",
        "LOGOUT",
        "SYNC",
        "PAY",
      ],
      index: true,
    },

    severity: {
      type: String,
      enum: ["INFO", "WARNING", "CRITICAL"],
      default: "INFO",
    },

    source: {
      type: String,
      enum: ["MANUAL", "SYSTEM", "API", "SAP_SYNC", "SCHEDULER"],
      default: "MANUAL",
    },

    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    requestId: String,

    changes: [
      {
        field: String,
        oldValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
      },
    ],

    metadata: {
      before: Schema.Types.Mixed,
      after: Schema.Types.Mixed,
    },

    remarks: {
      type: String,
      maxlength: 1000,
      trim: true,
    },

    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

AuditLogSchema.index({ tenantId: 1, module: 1, createdAt: -1 });
AuditLogSchema.index({ tenantId: 1, documentId: 1 });
AuditLogSchema.index({ tenantId: 1, performedBy: 1 });

export const AuditLog = model("AuditLog", AuditLogSchema);