
import { IntegrationCode } from "../types/tenantIntegrationTypes";
import { SapConnector } from "./connectors/sapConnector";

type ConnectorRegistry = {
  SAP: SapConnector;
  AZURE_AD: SapConnector;
  EMAIL_PROVIDER: SapConnector;
  MICROSOFT_MAIL: SapConnector;
  S3:SapConnector;
  STRIPE:SapConnector
};

export const connectorRegistry: ConnectorRegistry = {
  SAP: new SapConnector(),
  AZURE_AD: new SapConnector(),
  EMAIL_PROVIDER: new SapConnector(),
  MICROSOFT_MAIL: new SapConnector(),
  S3:new SapConnector(),
  STRIPE:new SapConnector()
};

export const getConnector = (code:IntegrationCode): SapConnector => {
  const connector = connectorRegistry[code];

  if (!connector) {
    throw new Error("Connector not found");
  }

  return connector;
};