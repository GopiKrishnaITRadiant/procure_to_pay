import { currencyModel } from "../models/currencyModel";

export const getCurrnecyByCountry = async (country: string) => {
    return await currencyModel.findOne({ country,isActive: true }).lean();
};