import axios from 'axios';
import { buildSapUrl } from '../connectors/buildSapUrl';

export const ODataAdapter = {
  async call({
    connection,
    endpoint,
    resourceConfig,
    payload,
    params,
  }: {
    connection: any;
    endpoint: any;
    resourceConfig: any;
    payload: any;
    params: any;
  }) {

    const url = buildSapUrl({
      baseUrl: connection.baseUrl,
      odataVersion: connection.odataVersion,
      endpoint,
      resource: resourceConfig,
      keys: params?.keys,
      query: params?.query,
    });

    const response = await axios({
      method: endpoint.method,
      url,
      params,
      data: payload,
      auth: connection.credentials,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  },
};