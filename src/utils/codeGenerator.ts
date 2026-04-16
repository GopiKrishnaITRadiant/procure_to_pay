import { customAlphabet } from "nanoid";
import { getNextSequence } from "../helpers/sequenceGenerator";
import crypto from "crypto";

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 4);

const generateCompanyCode = (companyName: string): string => {
    const baseCode = companyName
        .replace(/[^a-zA-Z]/g, "")
        .substring(0, 4)
        .toUpperCase();

    return `${baseCode}-${nanoid()}`;
};

export const generatePlanCode=(planName:string):string=>{
    const baseCode=planName
        .replace(/[^a-zA-Z]/g, "")
        .substring(0, 4)
        .toUpperCase();

    return `${baseCode}${nanoid()}`;
}

export default generateCompanyCode;

export const generateRequisitionNumber = async (connection: any) => {
  const sequence = await getNextSequence(connection, "PR");

  const year = new Date().getFullYear();

  return `PR-${year}-${sequence.toString().padStart(6, "0")}`;
};

export const generateVendorCode= async (connection: any) => {
  const sequence = await getNextSequence(connection, "VENDOR");

  const year = new Date().getFullYear();

  return `VENDOR-${year}-${sequence.toString().padStart(6, "0")}`;
}

export const generateDocumentCode = async (connection: any) => {
  const sequence = await getNextSequence(connection, "KYC");

  const year = new Date().getFullYear();

  return `INV-${year}-${sequence.toString().padStart(6, "0")}`;
}

export const generateRFQNumber = async (connection: any) => {
  const sequence = await getNextSequence(connection, "RFQ");

  const year = new Date().getFullYear();

  return `RFQ-${year}-${sequence.toString().padStart(6, "0")}`;
}

export const token = crypto.randomBytes(32).toString("hex");
const expires = new Date(Date.now() + 1000 * 60 * 60);