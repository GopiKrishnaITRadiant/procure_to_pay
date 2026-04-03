/**
 * Normalize keys to avoid case / underscore issues
 * Example:
 *  PurchaseOrder → purchaseorder
 *  purchase_order → purchaseorder
 */
export const normalizeKey = (key: string): string => {
  return key.replace(/[_\s]/g, "").toLowerCase();
};