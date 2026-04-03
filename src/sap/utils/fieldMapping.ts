export function mapFromSAP(data: any, mappings: any) {
  const result:{[key: string]: any} = {};

  mappings.forEach((map: any) => {
    result[map.internalField] = data[map.externalField];
  });

  return result;
}

export function mapToSAP(data: any, mappings: any) {
  const result:{[key: string]: any} = {};

  mappings.forEach((map: any) => {
    result[map.externalField] = data[map.internalField];
  });

  return result;
}

export function applyFieldMappingFromSAP(
  fieldMappings: any,
  resource: string,
  data: any[]
) {
  const mappings = fieldMappings?.get(resource);

  if (!mappings) return data;

  return data.map((item) => mapFromSAP(item, mappings));
}