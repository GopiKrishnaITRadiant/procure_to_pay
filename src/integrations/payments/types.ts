export type PaymentAction =
  | "createOrder"
  | "getPayment"
  | "refund"
  | "createCustomer"
  | "verifyPayment";

export interface StripeCredentials {
  provider: "stripe";
  secretKey: string;
  apiVersion?: string;
}

export interface RazorpayCredentials {
  provider: "razorpay";
  keyId: string;
  keySecret: string;
}

export type PaymentCredentials = StripeCredentials | RazorpayCredentials;