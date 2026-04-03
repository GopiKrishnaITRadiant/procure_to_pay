// src/payments/index.ts

import { StripeHandler } from "./stripeHandler";
import { RazorpayHandler } from "./razorpayHandler";
import {
  PaymentAction,
  PaymentCredentials,
  StripeCredentials,
  RazorpayCredentials,
} from "./types";

export class PaymentHandler {
  async execute(
    action: PaymentAction,
    payload: any,
    credentials: PaymentCredentials
  ) {
    if (!credentials?.provider) {
      throw new Error("Payment provider missing");
    }

    switch (credentials.provider) {
      case "stripe":
        return new StripeHandler(credentials as StripeCredentials).execute(
          action,
          payload
        );

      case "razorpay":
        return new RazorpayHandler(credentials as RazorpayCredentials).execute(
          action,
          payload
        );

      default:
        throw new Error(`Unsupported provider: ${credentials.provider}`);
    }
  }
}