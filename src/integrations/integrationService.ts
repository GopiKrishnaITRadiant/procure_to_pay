import { IntegrationCode } from "../types/tenantIntegrationTypes";
import { getConnector } from "./connectorRegistry";

export const executeIntegration = async ({
  req,
  tenantIntegrationId,
  integrationCode,

  resource,
  operation,

  payload,
  params,
}: {
  req: any;
  tenantIntegrationId: string;
  integrationCode: IntegrationCode;
  resource: {};
  operation: string;
  payload: any;
  params: any;
}) => {
  if (!req.tenantConnection) {
    throw new Error("Tenant connection not found");
  }
  const tenantIntegrationModel =
    req.tenantConnection.model("TenantIntegration");

  const connection =await tenantIntegrationModel.findOne({
    _id:tenantIntegrationId,
    // isActive: true,
  });

  if (!connection) {
    throw new Error("Integration not configured");
  }

  const connector = getConnector(integrationCode);

  return connector.execute({
    connection,

    resource,
    operation,

    payload,
    keys:"",
    query:params,
  });
};
