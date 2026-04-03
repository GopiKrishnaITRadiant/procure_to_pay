export const odataV2Adapter = (data: any) => {
  return data?.d?.results || [];
};