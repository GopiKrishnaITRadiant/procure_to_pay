// import { PaymentHandler } from "./payments/index";
import { StorageHandler } from "./storage/handlers/storageHandler";
import { EmailHandler } from "./email/handlers/emailHandler";

export class IntegrationExecutor {
  // private paymentHandler = new PaymentHandler();
  private storageHandler = new StorageHandler();
  private emailHandler = new EmailHandler();

  async execute(
    integrationCode: string,
    action: string,
    payload: any,
    credentials: any
  ) {
    switch (integrationCode) {
      // case "STRIPE":
      // case "RAZORPAY":
      //   return this.paymentHandler.execute(action as any, payload, credentials);

      case "S3":
      case "AZURE_BLOB":
      case "MINIO":
        return this.storageHandler.execute(action as any, payload, credentials);

      case "EMAIL_PROVIDER":
        return this.emailHandler.execute(action as any, payload, credentials);

      default:
        throw new Error(`Unsupported integration: ${integrationCode}`);
    }
  }
}
