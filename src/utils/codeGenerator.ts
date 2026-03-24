import { customAlphabet } from "nanoid";
import { getNextSequence } from "../helpers/sequenceGenerator";

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 4);

const generateCompanyCode = (companyName: string): string => {
    const baseCode = companyName
        .replace(/[^a-zA-Z]/g, "")
        .substring(0, 4)
        .toUpperCase();

    return `${baseCode}${nanoid()}`;
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