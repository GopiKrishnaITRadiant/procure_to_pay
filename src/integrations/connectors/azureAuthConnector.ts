// integrations/connectors/azureAuth.connector.ts

import axios from "axios";

export class AzureAuthConnector {

  async getAccessToken(connection) {

    const { tenantId, clientId, clientSecret } = connection.credentials;

    const url =
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams();

    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("grant_type", "client_credentials");
    params.append("scope", "https://graph.microsoft.com/.default");

    const response = await axios.post(url, params);

    return response.data.access_token;
  }

}