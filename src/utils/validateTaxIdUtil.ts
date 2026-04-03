type CountryCode =
  | "IN"
  | "US"
  | "GB"
  | "CA"
  | "AU"
  | "BD"
  | "LK"
  | "SG";

const taxRegexMap: Record<CountryCode, RegExp> = {
  IN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, // India GSTIN
  US: /^[0-9]{2}-[0-9]{7}$/, // US EIN
  GB: /^GB[0-9]{9}$|^GB[0-9]{12}$/, // UK VAT
  CA: /^[0-9]{9}$/, // Canada BN
  AU: /^AU[0-9]{11}$/, // Australia ABN
  BD: /^[0-9]{13}$/, // Bangladesh TIN
  LK: /^[0-9]{9}$/, // Sri Lanka TIN
  SG: /^[0-9]{9}M$/ // Singapore GST
};

export const validateTaxId = (country: CountryCode, taxId: string): boolean => {
  if (!taxId) return false;
  const normalized = taxId.trim().toUpperCase();
  const regex = taxRegexMap[country];
  if (!regex) return false; // unsupported country
  return regex.test(normalized);
};