import { getResourceConfig, getResourceOverride } from "./resourceResolver";
import { buildSAPRequest } from "./buildRequest";
import { callSAP } from "../clients/sapHttpClient";
import { adaptResponse } from "../adapters";
import { applyFieldMappingFromSAP } from "../utils/fieldMapping";

export const syncSAPResource = async (
  integration: any,
  template: any,
  resource: string
) => {
  
  const resourceConfig = getResourceConfig(template.resources, resource);
  if (!resourceConfig) return;

  const resourceOverride = getResourceOverride(
    integration.resourceOverrides,
    resource
  );

  if (resourceOverride?.enabled === false) return;

  const request = buildSAPRequest(
    integration,
    resourceConfig,
    resourceOverride
  );

  if (!request) return;

  console.log(`API Call → ${request.url}`);

  const response = await callSAP(
    request.url,
    request.method,
    integration.credentials
  );
  
  const adapted = adaptResponse(template, response.data);
  
  const mapped = applyFieldMappingFromSAP(
    template.fieldMappings,
    resource,
    adapted
  );
  console.log('mapped',mapped);
  return mapped;
};