import Stripe from "stripe";
import { PaymentAction, StripeCredentials } from "../types";

export class StripeHandler {
  private stripe: any

  constructor(private credentials: StripeCredentials) {
    this.stripe = new Stripe(this.credentials.secretKey, {
      apiVersion: "2024-06-20",
    });
  }

  async execute(action: PaymentAction, payload: any) {
    switch (action) {
      case "createOrder":
        return this.stripe.paymentIntents.create({
          amount: payload.amount,
          currency: payload.currency || "usd",
          metadata: payload.metadata,
        });

      case "getPayment":
        return this.stripe.paymentIntents.retrieve(payload.paymentId);

      case "refund":
        return this.stripe.refunds.create({
          payment_intent: payload.paymentId,
          amount: payload.amount,
        });

      case "createCustomer":
        return this.stripe.customers.create({
          email: payload.email,
          name: payload.name,
        });

      case "verifyPayment":
        return { message: "Use webhook verification for Stripe" };

      default:
        throw new Error(`Unsupported Stripe action: ${action}`);
    }
  }
}
//code committed not pushed