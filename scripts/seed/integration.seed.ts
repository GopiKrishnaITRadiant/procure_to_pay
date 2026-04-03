import mongoose from "mongoose";
import { integrationModel } from "../../src/models/integrationModel";
import { IntegrationTemplateModel } from "../../src/models/integrationTemplateModel";
import { odataV2fieldMappings, odataV4fieldMappings, restFieldMappings, seedIntegrationsData } from "../../src/utils/constants";

type BaseTemplate = {
  name: string;
  version: string;
  protocol: "odata" | "rest";
  resources: any;
  fieldMappings: Record<string, any>;
  isActive: boolean;
};

type ODataTemplate = BaseTemplate & {
  protocol: "odata";
  odataVersion: "v2" | "v4";
};

type RestTemplate = BaseTemplate & {
  protocol: "rest";
};

type TemplateType = ODataTemplate | RestTemplate;

const createDefaultTemplates = (integration: any): TemplateType[] => {
  if (integration.mode !== "TEMPLATE_BASED") {
    return [];
  }

  const sapOdataV4Template: ODataTemplate = {
    name: "sap-s4hana-odata-v4",
    version: "1.0.0",
    protocol: "odata",
    odataVersion: "v4",

    resources: {
      purchaseOrder: {
        serviceName: "API_PURCHASEORDER_2",
        keys: ["PurchaseOrder"],
        endpoints: [
          { operation: "list", method: "GET", entitySet: "PurchaseOrder" },
          {
            operation: "get",
            method: "GET",
            entitySet: "PurchaseOrder",
            expand: ["to_PurchaseOrderItem"],
          },
          { operation: "create", method: "POST", entitySet: "PurchaseOrder" },
          { operation: "update", method: "PATCH", entitySet: "PurchaseOrder" },
        ],
      },

      purchaseOrderItems: {
        serviceName: "API_PURCHASEORDER_2",
        keys: ["PurchaseOrder", "PurchaseOrderItem"],
        endpoints: [
          { operation: "list", method: "GET", entitySet: "PurchaseOrderItem" },
        ],
      },

      vendors: {
        serviceName: "API_BUSINESS_PARTNER",
        keys: ["BusinessPartner"],
        endpoints: [
          { operation: "list", method: "GET", entitySet: "A_BusinessPartner" },
        ],
      },

      invoices: {
        serviceName: "API_SUPPLIERINVOICE_PROCESS_SRV",
        keys: ["SupplierInvoice"],
        endpoints: [
          { operation: "list", method: "GET", entitySet: "A_SupplierInvoice" },
          { operation: "create", method: "POST", entitySet: "A_SupplierInvoice" },
        ],
      },

      payments: {
        serviceName: "API_JOURNALENTRY_SRV",
        keys: ["JournalEntry"],
        endpoints: [
          { operation: "list", method: "GET", entitySet: "A_JournalEntry" },
        ],
      },
    },

    fieldMappings: odataV4fieldMappings,
    isActive: true,
  };

  const sapOdataV2Template: ODataTemplate = {
    name: "sap-odata-v2",
    version: "1.0.0",
    protocol: "odata",
    odataVersion: "v2",

    resources: {
      purchaseOrders: {
        serviceName: "API_PURCHASEORDER",
        keys: ["PurchaseOrder"],
        endpoints: [
          { operation: "list", method: "GET", entitySet: "PurchaseOrderSet" },
          {
            operation: "get",
            method: "GET",
            entitySet: "PurchaseOrderSet",
            expand: ["PurchaseOrderItemSet"],
          },
          { operation: "create", method: "POST", entitySet: "PurchaseOrderSet" },
          { operation: "update", method: "PUT", entitySet: "PurchaseOrderSet" },
        ],
      },

      purchaseOrderItems: {
        serviceName: "API_PURCHASEORDER",
        keys: ["PurchaseOrder", "PurchaseOrderItem"],
        endpoints: [
          { operation: "list", method: "GET", entitySet: "PurchaseOrderItemSet" },
        ],
      },

      vendors: {
        serviceName: "API_VENDOR",
        keys: ["Vendor"],
        endpoints: [
          { operation: "list", method: "GET", entitySet: "VendorSet" },
        ],
      },

      invoices: {
        serviceName: "API_INVOICE",
        keys: ["Invoice"],
        endpoints: [
          { operation: "list", method: "GET", entitySet: "InvoiceSet" },
          { operation: "create", method: "POST", entitySet: "InvoiceSet" },
        ],
      },

      payments: {
        serviceName: "API_PAYMENT",
        keys: ["Payment"],
        endpoints: [
          { operation: "list", method: "GET", entitySet: "PaymentSet" },
        ],
      },
    },

    fieldMappings: odataV2fieldMappings,
    isActive: true,
  };

  const sapRestTemplate: RestTemplate = {
    name: "sap-rest-template",
    version: "1.0.0",
    protocol: "rest",

    resources: {
      purchaseOrders: {
        endpoints: [
          { operation: "list", method: "GET", path: "/api/purchase-orders" },
          { operation: "get", method: "GET", path: "/api/purchase-orders/{id}" },
        ],
      },

      vendors: {
        endpoints: [{ operation: "list", method: "GET", path: "/api/vendors" }],
      },

      invoices: {
        endpoints: [{ operation: "list", method: "GET", path: "/api/invoices" }],
      },

      payments: {
        endpoints: [{ operation: "list", method: "GET", path: "/api/payments" }],
      },
    },

    fieldMappings: restFieldMappings,
    isActive: true,
  };

  return [sapOdataV4Template, sapOdataV2Template, sapRestTemplate];
};

export const seedIntegrations = async () => {
  try {
    for (const integration of seedIntegrationsData) {

      const savedIntegration = await integrationModel.findOneAndUpdate(
        { code: integration.code },
        integration,
        { upsert: true, new: true }
      );

      const templates = createDefaultTemplates(integration);

      if (!templates.length) continue;

      for (const template of templates) {

        const filter: any = {
          integrationId: savedIntegration._id,
          version: template.version,
          protocol: template.protocol,
        };

        //Only for ODATA
        if (template.protocol === "odata") {
          filter.odataVersion = template.odataVersion;
        }

        await IntegrationTemplateModel.updateOne(
          filter,
          {
            $set: {
              ...template,
              integrationId: savedIntegration._id,
            },
          },
          { upsert: true }
        );
      }
    }

    console.log("Integrations & templates seeded successfully");

  } catch (error) {
    console.error("Seeder failed:", error);
  } finally {
    await mongoose.connection.close();
  }
};