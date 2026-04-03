// src/payments/types.ts

export type PaymentAction =
  | "createOrder"
  | "getPayment"
  | "refund"
  | "createCustomer"
  | "verifyPayment";

export interface StripeCredentials {
  provider: "stripe";
  secretKey: string;
}

export interface RazorpayCredentials {
  provider: "razorpay";
  keyId: string;
  keySecret: string;
}

export type PaymentCredentials = StripeCredentials | RazorpayCredentials;