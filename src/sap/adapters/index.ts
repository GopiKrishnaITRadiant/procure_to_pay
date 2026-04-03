import { odataV2Adapter } from "./odataV2Adapter";
import { odataV4Adapter } from "./odataV4Adapter";
import { restAdapter } from "./restAdapter";

export const adaptResponse = (template: any, data: any) => {
  if (template.protocol === "odata") {
    if (template.odataVersion === "v2") {
      return odataV2Adapter(data);
    }
    
    return odataV4Adapter(data);
  }

  return restAdapter(data);
};