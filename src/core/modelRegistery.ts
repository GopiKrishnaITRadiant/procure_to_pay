import { schemas } from "./schemas";

export const registerModels = (connection:any) => {
  Object.entries(schemas).forEach(([name, schema]) => {
    if (!connection.models[name]) {
      connection.model(name, schema);
    }
  });
};
