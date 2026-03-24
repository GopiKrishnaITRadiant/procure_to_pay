import bcrypt from "bcrypt";
import dotenv from "dotenv";
import {platformUserModel} from "../../src/models/platformUserModel"
import { SUPER_ADMIN_PERMISSIONS } from "../../src/utils/permissions";

dotenv.config({ path: ".env.development" });

export async function seedSuperAdmin() {
  const existing = await platformUserModel.findOne({ role: "SUPER_ADMIN" });

  if (existing) {
    console.log("Super Admin already exists");
    return;
  }

  const hashedPassword = await bcrypt.hash(
    process.env.SUPER_ADMIN_PASSWORD || "Admin@123",
    12
  );

  await platformUserModel.create({
    name: "Platform Owner",
    email: "superadmin@platform.com",
    password: hashedPassword,
    role: "SUPER_ADMIN",
    authProvider: "LOCAL",
    isVerified:true,
    permissions:SUPER_ADMIN_PERMISSIONS
  });

  console.log("Super Admin Created");
}