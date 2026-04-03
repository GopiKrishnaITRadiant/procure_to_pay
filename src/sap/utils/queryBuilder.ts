export const buildQueryString = (
  queryParams: Record<string, any>,
  expand?: string[]
): string => {
  const params = new URLSearchParams();

  // Handle $expand (OData)
  if (expand && expand.length > 0) {
    params.append("$expand", expand.join(","));
  }

  // Handle query params
  Object.entries(queryParams || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v !== undefined && v !== null) {
          params.append(key, String(v));
        }
      });
    } else {
      params.append(key, String(value));
    }
  });

  return params.toString();
};