import http from "http";
import https from "https";

const agentOptions = {
  keepAlive: true,
  // maxSockets: Infinity,   // (default) unlimited, scales with load
  maxFreeSockets: 5,         // keep only a handful idle
  freeSocketTimeout: 15000,  // flush idle after 15s
  timeout: 480000    
};

export const httpAgent = new http.Agent(agentOptions);

export const httpsAgent = new https.Agent(agentOptions);
