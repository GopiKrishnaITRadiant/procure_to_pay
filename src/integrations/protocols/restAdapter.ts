import axios from "axios";

export const RestAdapter = {

  async call({ connection, endpoint, payload, params }:{ connection: any; endpoint: any; payload: any; params: any }) {

    const url = `${connection.baseUrl}${endpoint.path}`;

    const response = await axios({
      method: endpoint.method,
      url,
      data: payload,
      params,
      headers: connection.headers || {},
      auth: connection.credentials
    });

    return response.data;
  }

};