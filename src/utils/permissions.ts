export const PERMISSIONS = {
  TENANT_ADMIN: {
    ACCESS_ALL: "access:all",
  },

  PLAN: {
    CREATE: "plan:create",
    UPDATE: "plan:update",
    DELETE: "plan:delete",
    READ_ALL: "plan:read:all",
    READ_ONE: "plan:read:one",
  },

  TENANT: {
    CREATE: "tenant:create",
    UPDATE: "tenant:update",
    DELETE: "tenant:delete",
    READ_ALL: "tenant:read:all",
    READ_ONE: "tenant:read:one",
  },

  TENANT_SUBSCRIPTION: {
    CREATE: "tenant-subscription:create",
    UPDATE: "tenant-subscription:update",
    DELETE: "tenant-subscription:delete",
    READ: "tenant-subscription:read",
  },

  TENANT_INTEGRATION: {
    CREATE: "tenant-integration:create",
    UPDATE: "tenant-integration:update",
    DELETE: "tenant-integration:delete",
    READ: "tenant-integration:read",
  },

  PURCHASE_REQUEST: {
    CREATE: "purchase-request:create",
    READ_ALL: "purchase-request:read:all",
    READ_OWN: "purchase-request:read:own",
    UPDATE: "purchase-request:update",
    DELETE: "purchase-request:delete",
    APPROVE: "purchase-request:approve",
    REJECT: "purchase-request:reject",
  },

  PO: {
    CREATE: "po:create",
    READ_ALL: "po:read:all",
    READ_OWN: "po:read:own",
    UPDATE: "po:update",
    APPROVE: "po:approve",
    REJECT: "po:reject",
    CANCEL: "po:cancel",
  },

  VENDOR: {
    CREATE: "vendor:create",
    READ_ALL: "vendor:read:all",
    READ_ONE: "vendor:read:one",
    UPDATE: "vendor:update",
    DELETE: "vendor:delete",

    SUBMIT: "vendor:submit",
    APPROVE: "vendor:approve",
    REJECT: "vendor:reject",

    ACTIVATE: "vendor:activate",
    DEACTIVATE: "vendor:deactivate",

    BLOCK: "vendor:block",
    UNBLOCK: "vendor:unblock",

    INVITE_USER: "vendor:invite:user",
  },

  VENDOR_USER: {
    LOGIN: "vendor-user:login",

    PROFILE_READ: "vendor-user:profile:read",
    PROFILE_UPDATE: "vendor-user:profile:update",

    PO_READ: "vendor-user:po:read",

    INVOICE_CREATE: "vendor-user:invoice:create",
    INVOICE_READ: "vendor-user:invoice:read",

    PAYMENT_READ: "vendor-user:payment:read",

    KYC_UPLOAD: "vendor-user:kyc:upload",
    KYC_READ: "vendor-user:kyc:read",
  },

  INVOICE: {
    CREATE: "invoice:create",
    READ_ALL: "invoice:read:all",
    READ: "invoice:read",
    APPROVE: "invoice:approve",
    REJECT: "invoice:reject",
  },

  PAYMENT: {
    INITIATE: "payment:initiate",
    RELEASE: "payment:release",
    READ: "payment:read",
  },

  REPORT: {
    READ: "report:read",
  },

  ROLE: {
    CREATE: "role:create",
    UPDATE: "role:update",
    READ: "role:read",
    READ_ALL: "role:read:all",
    DELETE: "role:delete",
  },

  AMOUNT_LIMIT: {
    CREATE_UPDATE: "amount-limit:create_update",
    READ: "amount-limit:read",
    READ_ALL: "amount-limit:read:all",
    DELETE: "amount-limit:delete",
  },
  TENANT_USER: {
    READ: "tenat-user:read",
    READ_ALL: "tenant-user:read:all",
    UPDATE: "tenat-user:update",
    DELETE: "tenant-user:delete",
  },

  TERMS: {
    READ: "terms:read",
    CREATE: "terms:create",
    UPDATE: "terms:update",
    ACTIVE: "terms:active",
    INACTIVE: "terms:inactive",
  },
};

export const SUPER_ADMIN_PERMISSIONS = [
  // ...Object.values(PERMISSIONS.PO),
  ...Object.values(PERMISSIONS.PLAN),
  ...Object.values(PERMISSIONS.TENANT),
  // ...Object.values(PERMISSIONS.TENANT_INTEGRATION),
  ...Object.values(PERMISSIONS.TENANT_SUBSCRIPTION),
  // ...Object.values(PERMISSIONS.VENDOR),
  PERMISSIONS.REPORT.READ,
];
