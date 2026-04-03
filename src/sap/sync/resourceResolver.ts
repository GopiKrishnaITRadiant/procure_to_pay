import {normalizeKey} from "../utils/normalizeKey"

export const resolveResources = (integration: any, template: any) => {
  const templateResources = Array.from(
    template.resources.keys()
  );

  const enabledResources =
    integration.enabledResources?.length
      ? integration.enabledResources
      : templateResources;

  const overrideResources = Object.keys(
    integration.resourceOverrides || {}
  );

  const final = [...new Set([...enabledResources, ...overrideResources])];

  return final;
};

export const getResourceConfig = (resourcesMap: Map<string, any>, resource: string) => {
  const normalizedInput = normalizeKey(resource);

  for (const [key, value] of resourcesMap.entries()) {
    if (normalizeKey(key) === normalizedInput) {
      return value;
    }
  }

  return null;
};

export const getResourceOverride = (overrides: any, resource: string) => {
  if (!overrides) return null;

  const normalizedInput = normalizeKey(resource);

  for (const key of Object.keys(overrides)) {
    if (normalizeKey(key) === normalizedInput) {
      return overrides[key];
    }
  }

  return null;
};