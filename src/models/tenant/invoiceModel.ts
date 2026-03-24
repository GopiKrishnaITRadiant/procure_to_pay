import { Schema, Types, model } from "mongoose";

export interface IInvoiceItem {
  itemNumber: string; // reference to PO item
  quantity: number;
  amount: number;
}

export interface IInvoice {
  purchaseOrderId: Types.ObjectId;
  invoiceNumber: string;

  supplier: string;
  invoiceDate: Date;

  items: IInvoiceItem[];

  totalAmount: number;
  currency: string;

  status: "POSTED" | "PAID" | "REJECTED";
}