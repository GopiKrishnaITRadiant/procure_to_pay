import axios from "axios";
import { httpAgent,httpsAgent } from "../config/httpAgentConfit";
import { optimizePO } from "../helpers/normalizedPo";
import { PO } from "../types/customTypes";
import { ISapConfig } from "../types/tenantIntegrationTypes";

export const fetchSAPData = async (sapConfig: ISapConfig) => {
  try {
    if(!sapConfig.subUrls){
      return "tset"
    }
    const poDataObj = sapConfig.subUrls.find(obj => 'getPOData' in obj);
    if (!poDataObj) {
      return "get PO Data not found";
    }
    const token = Buffer.from(
      `${sapConfig.username}:${sapConfig.password}`
    ).toString("base64");

    const response = await axios.get(
      `${sapConfig.baseUrl}${sapConfig.subUrls.getPOData}`,
      {
        headers: {
          Authorization: `Basic ${token}`,
        },
        httpAgent,
        httpsAgent,
      }
    );

    const rawData = response?.data?.d?.results || [];

    const optimizedData = rawData.map(optimizePO);

    const filterPo = optimizedData.filter(
      (po: any) => po.Del_sts === "Not Delivered Yet"
    );

    return {
      SAP_PO_Data: optimizedData,
      filterPo,
    };
  } catch (error: any) {
    console.error("SAP fetch error:", error.message);

    return {
      SAP_PO_Data: [],
      filterPo: [],
    };
  }
};
