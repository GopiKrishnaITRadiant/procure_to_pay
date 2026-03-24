import mongoose from "mongoose";
import { integrationModel } from "../../src/models/integrationModel";
import { IntegrationTemplate } from "../../src/models/integrationTemplateModel";

const integrations = [
  {
    name: "SAP ERP",
    code: "SAP",
    category: "ERP",
    description: "Enterprise Resource Planning integration",
    supportedProtocols: ["odata", "rest"],
    isActive: true,
    supportedEnvironments: ["dev", "staging", "prod"],
  },
  {
    name: "Azure Active Directory",
    code: "AZURE_AD",
    category: "AUTH",
    description: "Authentication via Azure AD",
    supportedProtocols: ["rest"],
    isActive: true,
    supportedEnvironments: ["dev", "staging", "prod"],
  },
  {
    name: "AWS S3 Storage",
    code: "S3",
    category: "STORAGE",
    description: "Cloud storage integration with AWS S3",
    supportedProtocols: ["rest"],
    isActive: true,
    supportedEnvironments: ["dev", "staging", "prod"],
  },
  {
    name: "Stripe Payment Gateway",
    code: "STRIPE",
    category: "PAYMENT",
    description: "Payment gateway integration with Stripe",
    supportedProtocols: ["rest"],
    isActive: true,
    supportedEnvironments: ["dev", "staging", "prod"],
  },
  {
    name: "Email Provider",
    code: "EMAIL_PROVIDER",
    category: "COMMUNICATION",
    description: "Send emails using providers like SES / SendGrid",
    supportedProtocols: ["rest"],
    isActive: true,
    supportedEnvironments: ["dev", "staging", "prod"],
  },
];

const createDefaultTemplates = (integrationCode: string) => {

  if (integrationCode !== "SAP") {
    return [
      {
        name: integrationCode,
        version: "1.0.0",
        protocol: "rest",
        resources: {},
        fieldMappings: {},
        isActive: true
      }
    ];
  }

  const sapOdataTemplate = {
    name: "sap-s4hana-procurement",
    version: "1.0.0",
    protocol: "odata",
    odataVersion: "v4",

    resources: {

      purchaseOrders: {
        serviceName: "API_PURCHASEORDER_2",
        keys: ["PurchaseOrder"],

        endpoints: [
          { operation: "list", method: "GET", entitySet: "PurchaseOrder" },
          { operation: "get", method: "GET", entitySet: "PurchaseOrder", expand: ["to_PurchaseOrderItem"] },
          { operation: "create", method: "POST", entitySet: "PurchaseOrder" },
          { operation: "update", method: "PATCH", entitySet: "PurchaseOrder" }
        ]
      },

      purchaseOrderItems: {
        serviceName: "API_PURCHASEORDER_2",
        keys: ["PurchaseOrder", "PurchaseOrderItem"],

        endpoints: [
          { operation: "list", method: "GET", entitySet: "PurchaseOrderItem" },
          { operation: "get", method: "GET", entitySet: "PurchaseOrderItem" }
        ]
      },

      goodsReceipts: {
        serviceName: "API_MATERIAL_DOCUMENT_SRV",
        keys: ["MaterialDocument"],

        endpoints: [
          { operation: "list", method: "GET", entitySet: "MaterialDocument" },
          { operation: "create", method: "POST", entitySet: "MaterialDocument" }
        ]
      },

      supplierInvoices: {
        serviceName: "API_SUPPLIERINVOICE_PROCESS_SRV",
        keys: ["SupplierInvoice"],

        endpoints: [
          { operation: "list", method: "GET", entitySet: "SupplierInvoice" },
          { operation: "create", method: "POST", entitySet: "SupplierInvoice" }
        ]
      },

      payments: {
        serviceName: "API_JOURNALENTRY_SRV",
        keys: ["JournalEntry"],

        endpoints: [
          { operation: "list", method: "GET", entitySet: "JournalEntry" },
          { operation: "create", method: "POST", entitySet: "JournalEntry" }
        ]
      },

      documents: {
        serviceName: "API_CV_ATTACHMENT_SRV",
        keys: ["DocumentInfoRecord"],

        endpoints: [
          { operation: "list", method: "GET", entitySet: "DocumentInfoRecord" },
          { operation: "create", method: "POST", entitySet: "DocumentInfoRecord" }
        ]
      }

    },

    fieldMappings: {},
    isActive: true
  };


  const sapRestTemplate = {
    name: "sap-rest-template",
    version: "1.0.0",
    protocol: "rest",

    resources: {

      purchaseOrders: {
        endpoints: [
          { operation: "list", method: "GET", path: "/api/purchase-orders" },
          { operation: "get", method: "GET", path: "/api/purchase-orders/{id}" },
          { operation: "create", method: "POST", path: "/api/purchase-orders" },
          { operation: "update", method: "PATCH", path: "/api/purchase-orders/{id}" }
        ]
      },

      goodsReceipts: {
        endpoints: [
          { operation: "list", method: "GET", path: "/api/goods-receipts" },
          { operation: "create", method: "POST", path: "/api/goods-receipts" }
        ]
      },

      attachments: {
        endpoints: [
          { operation: "list", method: "GET", path: "/api/attachments" },
          { operation: "get", method: "GET", path: "/api/attachments/{id}" },
          { operation: "create", method: "POST", path: "/api/attachments" },
          { operation: "delete", method: "DELETE", path: "/api/attachments/{id}" }
        ]
      }

    },

    fieldMappings: {},
    isActive: true
  };

  return [sapOdataTemplate, sapRestTemplate];
};

export const seedIntegrations = async () => {
  try {

    for (const integration of integrations) {

      const savedIntegration = await integrationModel.findOneAndUpdate(
        { code: integration.code },
        integration,
        { upsert: true, returnDocument:'after' }
      );

      const templates = createDefaultTemplates(integration.code);

      for (const template of templates) {

        await IntegrationTemplate.updateOne(
          {
            integrationId: savedIntegration._id,
            version: template.version,
            protocol: template.protocol
          },
          {
            $set: {
              ...template,
              integrationId: savedIntegration._id
            }
          },
          { upsert: true }
        );

      }
    }

    console.log("Integrations and templates seeded successfully");

  } catch (error) {

    console.error("Seeder failed:", error);

  } finally {

    await mongoose.connection.close();

  }
};