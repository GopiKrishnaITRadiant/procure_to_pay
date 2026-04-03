export const odataV4Adapter = (data: any) => {
  return data?.value || [];
};