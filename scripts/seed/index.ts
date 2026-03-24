import mongoose from "mongoose";
import dotenv from "dotenv";
import { seedSuperAdmin } from "./superAdmin.seed";
import { seedPlans } from "./plan.seed";
import { seedIntegrations } from "./integration.seed";


dotenv.config({ path: ".env.dev" });

async function runSeeds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    await seedSuperAdmin();
    await seedPlans();
    await seedIntegrations()

    console.log("All seeds executed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

runSeeds();