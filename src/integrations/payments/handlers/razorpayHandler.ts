// src/payments/razorpayHandler.ts

import Razorpay from "razorpay";
import crypto from "crypto";
import { PaymentAction, RazorpayCredentials } from "./types";

export class RazorpayHandler {
  private razorpay: Razorpay;

  constructor(private credentials: RazorpayCredentials) {
    this.razorpay = new Razorpay({
      key_id: credentials.keyId,
      key_secret: credentials.keySecret,
    });
  }

  async execute(action: PaymentAction, payload: any) {
    switch (action) {
      case "createOrder":
        return this.razorpay.orders.create({
          amount: payload.amount,
          currency: payload.currency || "INR",
          receipt: payload.receipt,
          notes: payload.notes,
        });

      case "getPayment":
        return this.razorpay.payments.fetch(payload.paymentId);

      case "refund":
        return this.razorpay.payments.refund(payload.paymentId, {
          amount: payload.amount,
        });

      case "verifyPayment":
        const body = payload.orderId + "|" + payload.paymentId;

        const expectedSignature = crypto
          .createHmac("sha256", this.credentials.keySecret)
          .update(body)
          .digest("hex");

        return { verified: expectedSignature === payload.signature };

      case "createCustomer":
        return this.razorpay.customers.create({
          name: payload.name,
          email: payload.email,
          contact: payload.phone,
        });

      default:
        throw new Error(`Unsupported Razorpay action: ${action}`);
    }
  }
}