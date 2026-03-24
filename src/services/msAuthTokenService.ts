import axios from "axios";
import { ApiError } from "../utils/apiErrors";

const clientId = process.env.OAUTH_CLIENT_ID as string;
const clientSecret = process.env.OAUTH_CLIENT_SECRET as string;
const tenantId = process.env.OAUTH_TENANT_ID as string;

export const accessToken = async () => {
  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  try {
    const response = await axios.post(
      tokenEndpoint,
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
        scope: "https://graph.microsoft.com/.default",
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (response.data && response.data.access_token) {
      return response.data.access_token;
    } else {
      throw new ApiError(500, "No access token received");
    }
  } catch (error) {
    throw new ApiError(500, "Failed to fetch access token");
  }
};
