import axios from "axios";
import { IntegrationTemplate, IResourceConfig } from "../../models/integrationTemplateModel";
import { buildSapUrl } from "./buildSapUrl";

export class SapConnector {

  async execute({
    connection,
    resource,
    operation,
    payload,
    keys,
    query
  }: {connection:any,resource:any,operation:string,payload:any,keys:any,query:any}) {

    const template = await IntegrationTemplate
      .findById(connection.templateId)
      .lean();

    if (!template) {
      throw new Error("SAP template not found");
    }

    // Convert object → Map if needed
    const resources =
      template.resources instanceof Map
        ? template.resources
        : new Map(Object.entries(template.resources));

    const resourceConfig = resources.get(resource)as IResourceConfig;
    console.log('resourceConfig',resourceConfig)

    if (!resourceConfig) {
      throw new Error(`Resource ${resource} not supported`);
    }

    const endpoint = resourceConfig?.endpoints?.find(
      (e: any) => e.operation === operation
    );
    console.log('endpoint',endpoint)

    if (!endpoint) {
      throw new Error(`Operation ${operation} not supported`);
    }

    const url = buildSapUrl({
      baseUrl: connection.baseUrl,
      endpoint,
      resource: resourceConfig,
      keys,
      query,
      odataVersion: template.odataVersion || "v4"
    });

    const response = await axios({
      method: endpoint.method,
      url,
      data: payload,
      headers: {
        // Authorization: `Bearer ${connection.authToken}`,
        'APIKey':"aQUNjOokPm2jpbJ1DXT0Q7gH55qtvXsD",
        "Content-Type": "application/json"
      }
    });
    
    return response.data;
  }

}