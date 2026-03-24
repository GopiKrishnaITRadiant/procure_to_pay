import { encrypt } from "../utils/cryptoUtil";

export const sanitizeCredentials = (
  integrationCode: string,
  credentials: any
) => {

  switch (integrationCode) {

    case "SAP": {
      const { username, password, sapClient } = credentials;

      if (!username || !password) {
        throw new Error("Invalid SAP credentials");
      }

      return {
        username,
        password: encrypt(password),
        sapClient
      };
    }

    case "AZURE_AD": {
      const { clientId, tenantId, clientSecret, redirectUri } = credentials;

      if (!clientId || !tenantId || !clientSecret) {
        throw new Error("Invalid Azure AD credentials");
      }

      return {
        clientId,
        tenantId,
        clientSecret: encrypt(clientSecret),
        redirectUri
      };
    }

    case "S3": {
      const { accessKeyId, secretAccessKey, region, bucketName } = credentials;

      if (!accessKeyId || !secretAccessKey || !region || !bucketName) {
        throw new Error("Invalid S3 credentials");
      }

      return {
        accessKeyId: encrypt(accessKeyId),
        secretAccessKey: encrypt(secretAccessKey),
        region,
        bucketName
      };
    }

    case "STRIPE": {
      const { secretKey, webhookSecret } = credentials;

      if (!secretKey) {
        throw new Error("Invalid Stripe credentials");
      }

      return {
        secretKey: encrypt(secretKey),
        webhookSecret: webhookSecret ? encrypt(webhookSecret) : undefined
      };
    }

    case "EMAIL_PROVIDER": {
      const { provider } = credentials;

      if (!provider) {
        throw new Error("Email provider required");
      }

      if (provider === "sendgrid") {
        return {
          provider,
          apiKey: encrypt(credentials.apiKey)
        };
      }

      if (provider === "ses") {
        return {
          provider,
          accessKeyId: encrypt(credentials.accessKeyId),
          secretAccessKey: encrypt(credentials.secretAccessKey),
          region: credentials.region
        };
      }

      if (provider === "smtp") {
        return {
          provider,
          host: credentials.host,
          port: credentials.port,
          username: credentials.username,
          password: encrypt(credentials.password)
        };
      }

      if (provider === "microsoft_graph") {
        return {
          provider,
          clientId: credentials.clientId,
          tenantId: credentials.tenantId,
          clientSecret: encrypt(credentials.clientSecret)
        };
      }

      throw new Error("Unsupported email provider");
    }

    default:
      throw new Error("Unsupported integration type");
  }
};