import axios from "axios";
import { decrypt } from "../../utils/cryptoUtil";

export const callSAP = async (url: string, method: string, credentials: any) => {
  const config: any = { url, method };

  if (credentials?.username) {
    config.auth = {
      username: credentials.username,
      password: credentials.password,
    };
  }

  if (credentials?.apiKey) {
    config.headers = {
      apikey: decrypt(credentials.apiKey),
    };
  }

  return axios(config);
};