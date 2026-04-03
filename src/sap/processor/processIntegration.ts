import { resolveResources } from "../sync/resourceResolver";
import { syncSAPResource } from "../sync/syncSAPResource";
import { checkIfDue, retry, withTimeout } from "../../utils/sapUtil";

export const processIntegration = async (
  tenantConnection: any,
  integration: any,
  IntegrationTemplateModel: any
) => {
  try {
    if (!checkIfDue(integration.lastSyncedAt, integration.syncFrequency)) {
      return;
    }

    const template = await IntegrationTemplateModel.findById(
      integration.templateId
    );

    if (!template) return;

    console.log(`Syncing: ${integration.name}`);

    const resources = resolveResources(integration, template);

    for (const resource of resources) {
      try {
        await retry(() =>
          withTimeout(
            syncSAPResource(integration, template, resource),
            30000
          )
        );

        console.log(`✅ ${resource}`);
      } catch (err: any) {
        console.error(`❌ ${resource}`, err.message);
      }
    }

  } catch (err: any) {
    console.error(`Integration failed`, err.message);
  }
};