import mongoose, { Connection } from "mongoose";
import { registerModels } from "./modelRegistery";

const tenantConnections: Map<string, Connection> = new Map();

export const getTenantConnection = async (companyCode: string): Promise<Connection> => {
  if (tenantConnections.has(companyCode)) {
    return tenantConnections.get(companyCode)!;
  }

  const uri = `mongodb://localhost:27017/p2p_tenant_${companyCode}`;

  const connection = await mongoose.createConnection(uri, {
    maxPoolSize: 20,
  }).asPromise();

  registerModels(connection);

  tenantConnections.set(companyCode, connection);

  console.log(`Connected to tenant DB: ${companyCode}`);
  return connection;
};