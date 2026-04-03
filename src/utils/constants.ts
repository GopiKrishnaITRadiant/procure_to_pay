import { Types } from "mongoose";
import { PERMISSIONS } from "./permissions";

export const defaultApprovalLimits = [
  {
    role: "Manager",
    department: null,
    minAmount: 0,
    maxAmount: 50000,
    level: 1,
    approvalsRequired: 1,
  },
  {
    role: "Buyer",
    department: null,
    minAmount: 0,
    maxAmount: 200000,
    level: 2,
    approvalsRequired: 2,
  },
  {
    role: "Finance",
    department: null,
    minAmount: 0,
    maxAmount: 1000000,
    level: 3,
    approvalsRequired: 3,
  },
  {
    role: "Admin",
    department: null,
    minAmount: 0,
    maxAmount: Number.MAX_SAFE_INTEGER,
    level: 99,
    priority: 1,
  },
];

export const defaultRoles = [
  {
    name: "Admin",
    permissions: [
      PERMISSIONS.TENANT_ADMIN.ACCESS_ALL,
    ],
    isActive: true,
    level: Number.MAX_SAFE_INTEGER
  },
  {
    name: "Requester",
    permissions: [
      PERMISSIONS.PURCHASE_REQUEST.CREATE,
      PERMISSIONS.PURCHASE_REQUEST.UPDATE,
      PERMISSIONS.PURCHASE_REQUEST.READ_ALL,
      PERMISSIONS.PURCHASE_REQUEST.READ_OWN,
      PERMISSIONS.PURCHASE_REQUEST.DELETE,
    ],
    isActive: true
  },
  {
    name: "Manager",
    permissions: [
      PERMISSIONS.PURCHASE_REQUEST.APPROVE,
      PERMISSIONS.PURCHASE_REQUEST.REJECT,
      PERMISSIONS.PO.CANCEL,
    ],
    isActive: true,
    level: 1
  },
  {
    name: "Buyer",
    permissions: [
      PERMISSIONS.PO.CREATE,
      PERMISSIONS.PO.UPDATE,
      PERMISSIONS.PO.APPROVE,
      PERMISSIONS.VENDOR.READ_ALL,
    ],
    isActive: true,
    level: 2
  },
  {
    name: "Finance",
    permissions: [
      PERMISSIONS.INVOICE.APPROVE,
      PERMISSIONS.INVOICE.REJECT,
      PERMISSIONS.PAYMENT.RELEASE,
    ],
    isActive: true,
    level: 3
  },
];

export const vendorRole = {
  name: "Vendor",
  permissions: [
    PERMISSIONS.PO.READ_OWN,
    PERMISSIONS.INVOICE.CREATE,
    PERMISSIONS.PO.APPROVE,
    PERMISSIONS.PO.REJECT,
  ],
  isActive: true
};

export default defaultRoles;

export const defaultCategories = [
  {
    name: "Active Pharmaceutical Ingredient (API)",
    description: "Active pharmacetical ingredient",
    isActive: true,
  },
  {
    name: "Excipients",
    description: "excipients",
    isActive: true,
  },
  {
    name: "Packaging Materials",
    description: "packaging materials",
    isActive: true,
  },
  {
    name: "Laboratory Chemicals",
    description: "laboratory",
    isActive: true,
  },
  {
    name: "Medical Devices / Instruments",
    description: "medical devices and instruments",
    isActive: true,
  },
  {
    name: "Cleaning & Sanitization Chemicals",
    description: "cleaning and sanirization chemicals",
    isActive: true,
  },
  {
    name: "Services",
    description: "services",
    isActive: true,
  },
  {
    name: "Maintenance & Spare Parts",
    description: "maintenance and spare parts",
    isActive: true,
  },
  {
    name: "IT & Software Licenses",
    description: "it and software licenses",
    isActive: true,
  },
  {
    name: "Safety & Personal Protective Equipment (PPE)",
    description: "safety and personal protective equipment",
    isActive: true,
  },
];

export const defaultMaterials = [
  {
    materialCode: "API-PARA-500MG",
    description: "Paracetamol 500mg Active Pharmaceutical Ingredient",
    unitOfMeasure: "KG",
    price: 1000,
    currency: "USD",
    isActive: true,
    category: "Active Pharmaceutical Ingredient (API)"
  },
  {

    materialCode: "EXC-TALC",
    description: "Talc Powder - Exipient",
    unitOfMeasure: "KG",
    price: 50,
    currency: "USD",
    isActive: true,
    category: "Excipients"
  },
  {

    materialCode: "PACK-BOTTLE-100ML",
    description: "Amber Bottle 100ml",
    unitOfMeasure: "EA",
    price: 0.5,
    currency: "USD",
    isActive: true,
    category: "Packaging Materials"
  },
  {

    materialCode: "LAB-ETHANOL-99",
    description: "Ethanol 99% Laboratory Reagent",
    unitOfMeasure: "L",
    price: 25,
    currency: "USD",
    isActive: true,
    category: "Laboratory Chemicals"
  },
  {

    materialCode: "PPE-GLOVES",
    description: "Nitrile Gloves",
    unitOfMeasure: "BOX",
    price: 10,
    currency: "USD",
    isActive: true,
    category: "Medical Devices / Instruments"
  },
];

const VALID_CODES = [
  "SAP",
  "AZURE_OAUTH",
  "S3",
  "STRIPE",
  "EMAIL_PROVIDER",
  "MICROSOFT_MAIL",
  "RAZORPAY",
  "S3_EMAIL_PROVIDER",
  "GOOGLE_OAUTH",
]

export const seedIntegrationsData = [
  {
    name: "SAP ERP",
    code: "SAP",
    description: "Enterprise Resource Planning integration",
    mode: "TEMPLATE_BASED",
    supportedProtocols: ["odata", "rest"],
    isActive: true,
    supportedEnvironments: ["dev", "staging", "prod"],
    capabilities: {
      supportsWebhook: false,
      supportsPolling: true,
      supportsOAuth: true,
    },

    credentialSchema: {
      authType: {
        type: "string",
        required: true,
        enum: ["basic", "apikey", "oauth"],
        default: "basic",
      },

      // Basic Auth
      username: {
        type: "string",
        required: (creds: any) => creds.authType === "basic",
      },
      password: {
        type: "string",
        required: (creds: any) => creds.authType === "basic",
        sensitive: true,
      },

      // API Key
      apiKey: {
        type: "string",
        required: (creds: any) => creds.authType === "apikey",
        sensitive: true,
      },

      // OAuth
      clientId: {
        type: "string",
        required: (creds: any) => creds.authType === "oauth",
      },
      clientSecret: {
        type: "string",
        required: (creds: any) => creds.authType === "oauth",
        sensitive: true,
      },
      tokenUrl: {
        type: "string",
        required: (creds: any) => creds.authType === "oauth",
      },

      // optional SAP client
      sapClient: { type: "string", required: false },
    },
  },

  {
    name: "Azure Active Directory",
    code: "AZURE_AD",
    description: "Authentication via Azure AD",
    mode: "SDK_BASED",
    supportedProtocols: ["rest"],
    isActive: true,
    supportedEnvironments: ["dev", "staging", "prod"],
    capabilities: {
      supportsWebhook: false,
      supportsPolling: false,
      supportsOAuth: true,
    },

    credentialSchema: {
      clientId: { type: "string", required: true },
      tenantId: { type: "string", required: true },
      clientSecret: { type: "string", required: true, sensitive: true },
      redirectUri: { type: "string", required: false },
    },
  },
  {
    name: "AWS S3 Storage",
    code: "S3",
    description: "Cloud storage integration with AWS S3",
    mode: "SDK_BASED",
    supportedProtocols: ["rest"],
    isActive: true,
    supportedEnvironments: ["dev", "staging", "prod"],
    capabilities: {
      supportsWebhook: false,
      supportsPolling: false,
      supportsOAuth: false,
    },

    credentialSchema: {
      accessKeyId: { type: "string", required: true, sensitive: true },
      secretAccessKey: { type: "string", required: true, sensitive: true },
      region: { type: "string", required: true },
      bucketName: { type: "string", required: true },
    },
  },

  {
    name: "Stripe Payment Gateway",
    code: "STRIPE",
    description: "Payment gateway integration with Stripe",
    mode: "SDK_BASED",
    supportedProtocols: ["rest"],
    isActive: true,
    supportedEnvironments: ["dev", "staging", "prod"],
    capabilities: {
      supportsWebhook: true,
      supportsPolling: false,
      supportsOAuth: false,
    },

    credentialSchema: {
      secretKey: { type: "string", required: true, sensitive: true },
      webhookSecret: { type: "string", required: false, sensitive: true },
    },
  },

  {
    name: "Email Provider",
    code: "EMAIL_PROVIDER",
    description: "Send emails using SES / SendGrid / SMTP",
    mode: "SDK_BASED",
    supportedProtocols: ["rest"],
    isActive: true,
    supportedEnvironments: ["dev", "staging", "prod"],
    capabilities: {
      supportsWebhook: false,
      supportsPolling: false,
      supportsOAuth: true,
    },

    // Dynamic provider-based schema
    credentialSchema: {
      provider: { type: "string", required: true },

      // SendGrid
      apiKey: {
        type: "string",
        required: (creds: any) => creds.provider === "sendgrid",
        sensitive: true,
      },

      // SES
      accessKeyId: {
        type: "string",
        required: (creds: any) => creds.provider === "ses",
        sensitive: true,
      },
      secretAccessKey: {
        type: "string",
        required: (creds: any) => creds.provider === "ses",
        sensitive: true,
      },
      region: {
        type: "string",
        required: (creds: any) => creds.provider === "ses",
      },

      // SMTP
      host: {
        type: "string",
        required: (creds: any) => creds.provider === "smtp",
      },
      port: {
        type: "number",
        required: (creds: any) => creds.provider === "smtp",
      },
      username: {
        type: "string",
        required: (creds: any) => creds.provider === "smtp",
      },
      password: {
        type: "string",
        required: (creds: any) => creds.provider === "smtp",
        sensitive: true,
      },

      // Microsoft Graph
      clientId: {
        type: "string",
        required: (creds: any) => creds.provider === "microsoft_graph",
      },
      tenantId: {
        type: "string",
        required: (creds: any) => creds.provider === "microsoft_graph",
      },
      clientSecret: {
        type: "string",
        required: (creds: any) => creds.provider === "microsoft_graph",
        sensitive: true,
      },
    },
  },
];

export const odataV4fieldMappings = {
  // Purchase Orders
  purchaseOrders: [
    { externalField: "PurchaseOrder", internalField: "id" },
    { externalField: "CreatedByUser", internalField: "createdBy" },
    { externalField: "CreationDate", internalField: "date" },
    { externalField: "LastChangeDateTime", internalField: "lastModified" },
    { externalField: "Supplier", internalField: "vendor" },
    { externalField: "PurchaseOrderType", internalField: "type" },
    { externalField: "CompanyCode", internalField: "companyCode" },
    { externalField: "PurchasingOrganization", internalField: "purchasingOrg" },
    { externalField: "PurchasingGroup", internalField: "purchasingGroup" },
    { externalField: "DocumentCurrency", internalField: "currency" },
    { externalField: "PurchaseOrderDate", internalField: "orderDate" }
  ],

  // Purchase Order Items
  purchaseOrderItems: [
    { externalField: "PurchaseOrderItem", internalField: "itemId" },
    { externalField: "PurchaseOrder", internalField: "purchaseOrderId" },
    { externalField: "Material", internalField: "materialCode" },
    { externalField: "Quantity", internalField: "quantity" },
    { externalField: "NetPrice", internalField: "price" },
    { externalField: "Currency", internalField: "currency" },
    { externalField: "DeliveryDate", internalField: "deliveryDate" },
    { externalField: "Plant", internalField: "plant" }
  ],

  // Vendors / Business Partners
  vendors: [
    { externalField: "BusinessPartner", internalField: "vendorId" },
    { externalField: "CompanyName", internalField: "name" },
    { externalField: "City", internalField: "city" },
    { externalField: "Country", internalField: "country" },
    { externalField: "TaxNumber", internalField: "taxNumber" },
    { externalField: "Currency", internalField: "currency" },
    { externalField: "Email", internalField: "email" }
  ],

  // Invoices / Supplier Invoices
  invoices: [
    { externalField: "Invoice", internalField: "invoiceId" },
    { externalField: "Supplier", internalField: "vendorId" },
    { externalField: "InvoiceDate", internalField: "date" },
    { externalField: "InvoiceAmount", internalField: "amount" },
    { externalField: "Currency", internalField: "currency" },
    { externalField: "PaymentTerms", internalField: "paymentTerms" }
  ],

  // Payments / Journal Entries
  payments: [
    { externalField: "Payment", internalField: "paymentId" },
    { externalField: "CompanyCode", internalField: "companyCode" },
    { externalField: "PaymentAmount", internalField: "amount" },
    { externalField: "PaymentMethod", internalField: "method" },
    { externalField: "DocumentDate", internalField: "date" },
    { externalField: "Currency", internalField: "currency" }
  ]
};

export const odataV2fieldMappings = {
  // Purchase Orders
  purchaseOrders: [
    { externalField: "PurchaseOrder", internalField: "id" },
    { externalField: "CreatedBy", internalField: "createdBy" },
    { externalField: "CreatedOn", internalField: "date" },
    { externalField: "ChangedOn", internalField: "lastModified" },
    { externalField: "Supplier", internalField: "vendor" },
    { externalField: "DocumentType", internalField: "type" },
    { externalField: "CompanyCode", internalField: "companyCode" },
    { externalField: "PurchOrg", internalField: "purchasingOrg" },
    { externalField: "PurchGroup", internalField: "purchasingGroup" },
    { externalField: "Currency", internalField: "currency" },
    { externalField: "DocDate", internalField: "orderDate" }
  ],

  // Purchase Order Items
  purchaseOrderItems: [
    { externalField: "Item", internalField: "itemId" },
    { externalField: "PurchaseOrder", internalField: "purchaseOrderId" },
    { externalField: "Material", internalField: "materialCode" },
    { externalField: "OrderQuantity", internalField: "quantity" },
    { externalField: "NetPrice", internalField: "price" },
    { externalField: "Currency", internalField: "currency" },
    { externalField: "DeliveryDate", internalField: "deliveryDate" },
    { externalField: "Plant", internalField: "plant" }
  ],

  // Vendors
  vendors: [
    { externalField: "Vendor", internalField: "vendorId" },
    { externalField: "Name", internalField: "name" },
    { externalField: "City", internalField: "city" },
    { externalField: "Country", internalField: "country" },
    { externalField: "TaxNo", internalField: "taxNumber" },
    { externalField: "Currency", internalField: "currency" },
    { externalField: "Email", internalField: "email" }
  ],

  // Invoices
  invoices: [
    { externalField: "InvoiceDoc", internalField: "invoiceId" },
    { externalField: "Vendor", internalField: "vendorId" },
    { externalField: "InvoiceDate", internalField: "date" },
    { externalField: "Amount", internalField: "amount" },
    { externalField: "Currency", internalField: "currency" },
    { externalField: "PaymentTerms", internalField: "paymentTerms" }
  ],

  // Payments
  payments: [
    { externalField: "PaymentDoc", internalField: "paymentId" },
    { externalField: "CompanyCode", internalField: "companyCode" },
    { externalField: "Amount", internalField: "amount" },
    { externalField: "PaymentMethod", internalField: "method" },
    { externalField: "PostingDate", internalField: "date" },
    { externalField: "Currency", internalField: "currency" }
  ]
};

export const restFieldMappings = {
  // Purchase Orders
  purchaseOrders: [
    { externalField: "id", internalField: "id" },
    { externalField: "createdBy", internalField: "createdBy" },
    { externalField: "createdAt", internalField: "date" },
    { externalField: "updatedAt", internalField: "lastModified" },
    { externalField: "vendorId", internalField: "vendor" },
    { externalField: "type", internalField: "type" },
    { externalField: "companyCode", internalField: "companyCode" },
    { externalField: "purchasingOrg", internalField: "purchasingOrg" },
    { externalField: "purchasingGroup", internalField: "purchasingGroup" },
    { externalField: "currency", internalField: "currency" },
    { externalField: "orderDate", internalField: "orderDate" }
  ],

  // Purchase Order Items
  purchaseOrderItems: [
    { externalField: "itemId", internalField: "itemId" },
    { externalField: "purchaseOrderId", internalField: "purchaseOrderId" },
    { externalField: "materialCode", internalField: "materialCode" },
    { externalField: "quantity", internalField: "quantity" },
    { externalField: "price", internalField: "price" },
    { externalField: "currency", internalField: "currency" },
    { externalField: "deliveryDate", internalField: "deliveryDate" },
    { externalField: "plant", internalField: "plant" }
  ],

  // Vendors
  vendors: [
    { externalField: "vendorId", internalField: "vendorId" },
    { externalField: "name", internalField: "name" },
    { externalField: "city", internalField: "city" },
    { externalField: "country", internalField: "country" },
    { externalField: "taxNumber", internalField: "taxNumber" },
    { externalField: "currency", internalField: "currency" },
    { externalField: "email", internalField: "email" }
  ],

  // Invoices
  invoices: [
    { externalField: "invoiceId", internalField: "invoiceId" },
    { externalField: "vendorId", internalField: "vendorId" },
    { externalField: "date", internalField: "date" },
    { externalField: "amount", internalField: "amount" },
    { externalField: "currency", internalField: "currency" },
    { externalField: "paymentTerms", internalField: "paymentTerms" }
  ],

  // Payments
  payments: [
    { externalField: "paymentId", internalField: "paymentId" },
    { externalField: "companyCode", internalField: "companyCode" },
    { externalField: "amount", internalField: "amount" },
    { externalField: "method", internalField: "method" },
    { externalField: "date", internalField: "date" },
    { externalField: "currency", internalField: "currency" }
  ]
};