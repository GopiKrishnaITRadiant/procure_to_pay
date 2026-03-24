import { IEndpointConfig, IResourceConfig } from "../../models/integrationTemplateModel";

interface BuildParams {
  baseUrl: string;
  odataVersion: "v4" | "v2";
  endpoint: IEndpointConfig;
  resource: IResourceConfig;
  keys?: Record<string, string>;
  query?: Record<string, any>;
}

export const buildSapUrl = ({
  baseUrl,
  odataVersion,
  endpoint,
  resource,
  keys = {},
  query = {}
}: BuildParams) => {

  let url = baseUrl;

  // Base OData path
  if (odataVersion === "v4") {
    url += `/sap/opu/odata4/sap/${resource.serviceName}/srvd_a2x/sap/${resource.serviceName.toLowerCase()}/0001`;
  } else {
    url += `/sap/opu/odata/sap/${resource.serviceName}`;
  }

  // Entity set
  if (endpoint.entitySet) {
    url += `/${endpoint.entitySet}`;
  }

  // Keys
  if (resource.keys?.length && Object.keys(keys).length) {

    const keyString = resource.keys
      .map((key) => `${key}='${keys[key]}'`)
      .join(",");

    url += `(${keyString})`;
  }

  // Query params
  const queryParams = new URLSearchParams();

  if (endpoint.expand?.length) {
    queryParams.append("$expand", endpoint.expand.join(","));
  }

  if (endpoint.queryParams) {
    for (const [k, v] of Object.entries(endpoint.queryParams)) {
      queryParams.append(k, String(v));
    }
  }

  for (const [k, v] of Object.entries(query)) {
    queryParams.append(k, String(v));
  }

  const qs = queryParams.toString();

  if (qs) url += `?${qs}`;

  return url;
};