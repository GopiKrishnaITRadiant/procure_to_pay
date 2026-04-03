
export class PaymentHandler {
  async execute(
    action: PaymentAction,
    payload: any,
    credentials: any
  ) {
    if (!credentials?.provider) {
      throw new Error("Payment provider missing");
    }

    switch (credentials.provider) {
      case "stripe":
        return this.handleStripe(action, payload, credentials);

      case "razorpay":
        return this.handleRazorpay(action, payload, credentials);

      default:
        throw new Error(`Unsupported provider: ${credentials.provider}`);
    }
  }
}


import Stripe from "stripe";

private async handleStripe(
  action: PaymentAction,
  payload: any,
  credentials: any
) {
  const stripe = new Stripe(credentials.secretKey, {
    apiVersion: "2024-06-20",
  });

  switch (action) {
    case "createOrder":
      return stripe.paymentIntents.create({
        amount: payload.amount, // in cents
        currency: payload.currency || "usd",
        metadata: payload.metadata,
      });

    case "getPayment":
      return stripe.paymentIntents.retrieve(payload.paymentId);

    case "refund":
      return stripe.refunds.create({
        payment_intent: payload.paymentId,
        amount: payload.amount,
      });

    case "createCustomer":
      return stripe.customers.create({
        email: payload.email,
        name: payload.name,
      });

    case "verifyPayment":
      // Stripe uses webhook-based verification mostly
      return { message: "Use webhook verification for Stripe" };

    default:
      throw new Error(`Unsupported Stripe action: ${action}`);
  }
}


import Razorpay from "razorpay";
import crypto from "crypto";

private async handleRazorpay(
  action: PaymentAction,
  payload: any,
  credentials: any
) {
  const razorpay = new Razorpay({
    key_id: credentials.keyId,
    key_secret: credentials.keySecret,
  });

  switch (action) {
    case "createOrder":
      return razorpay.orders.create({
        amount: payload.amount, // in paise
        currency: payload.currency || "INR",
        receipt: payload.receipt,
        notes: payload.notes,
      });

    case "getPayment":
      return razorpay.payments.fetch(payload.paymentId);

    case "refund":
      return razorpay.payments.refund(payload.paymentId, {
        amount: payload.amount,
      });

    case "verifyPayment":
      const body =
        payload.orderId + "|" + payload.paymentId;

      const expectedSignature = crypto
        .createHmac("sha256", credentials.keySecret)
        .update(body)
        .digest("hex");

      const isValid =
        expectedSignature === payload.signature;

      return { verified: isValid };

    case "createCustomer":
      return razorpay.customers.create({
        name: payload.name,
        email: payload.email,
        contact: payload.phone,
      });

    default:
      throw new Error(`Unsupported Razorpay action: ${action}`);
  }
}