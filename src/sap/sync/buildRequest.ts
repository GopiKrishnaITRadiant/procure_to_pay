import { buildQueryString } from "../utils/queryBuilder";

export const buildSAPRequest = (
  integration: any,
  resourceConfig: any,
  resourceOverride: any
) => {
  const listEndpoint = resourceConfig.endpoints.find(
    (e: any) => e.operation === "list" && e.isEnabled
  );

  if (!listEndpoint) return null;

  const operationOverride = resourceOverride?.list;

  if (operationOverride?.enabled === false) return null;

  const entitySet = operationOverride?.entitySet || listEndpoint.entitySet;

  const serviceName =
    operationOverride?.serviceName || resourceConfig.serviceName;

  const method = operationOverride?.method || listEndpoint.method || "GET";

  const expand = operationOverride?.expand || listEndpoint.expand;

  const queryParams = {
    ...(listEndpoint.queryParams || {}),
    ...(operationOverride?.queryParams || {}),
  };

  const queryString = buildQueryString(queryParams, expand);

  const url = `${integration.baseUrl}${serviceName}/${entitySet}${
    queryString ? `?${queryString}` : ""
  }`;

  return { url, method };
};