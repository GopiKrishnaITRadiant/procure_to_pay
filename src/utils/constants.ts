import { Types } from "mongoose";
import { PERMISSIONS } from "./permissions";

export const defaultApprovalLimits = [
  {
    role: "Manager",
    department: null,
    minAmount: 0,
    maxAmount: 49999,
    level: 1,
    priority: 1,
  },
  {
    role: "Buyer",
    department: null,
    minAmount: 50000,
    maxAmount: 200000,
    level: 2,
    priority: 1,
  },
  {
    role: "Finance",
    department: null,
    minAmount: 200001,
    maxAmount: 1000000,
    level: 3,
    priority: 1,
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
    isActive:true,
    level:Number.MAX_SAFE_INTEGER
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
    isActive:true
  },
  {
    name: "Manager",
    permissions: [
      PERMISSIONS.PURCHASE_REQUEST.APPROVE,
      PERMISSIONS.PURCHASE_REQUEST.REJECT,
      PERMISSIONS.PO.CANCEL,
    ],
    isActive:true,
    level:1
  },
  {
    name: "Buyer",
    permissions: [
      PERMISSIONS.PO.CREATE,
      PERMISSIONS.PO.UPDATE,
      PERMISSIONS.PO.APPROVE,
      PERMISSIONS.VENDOR.READ,
    ],
    isActive:true,
    level:2
  },
  {
    name: "Finance",
    permissions: [
      PERMISSIONS.INVOICE.APPROVE,
      PERMISSIONS.INVOICE.REJECT,
      PERMISSIONS.PAYMENT.RELEASE,
    ],
    isActive:true,
    level:3
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
  isActive:true
};

export default defaultRoles;

export const defaultCategories = [
  {
    name: "Active Pharmaceutical Ingredient (API)",
    description:"Active pharmacetical ingredient",
    isActive: true,
  },
  {
    name: "Excipients",
    description:"excipients",
    isActive: true,
  },
  {
    name: "Packaging Materials",
    description:"packaging materials",
    isActive: true,
  },
  {
    name: "Laboratory Chemicals",
    description:"laboratory",
    isActive: true,
  },
  {
    name: "Medical Devices / Instruments",
    description:"medical devices and instruments",
    isActive: true,
  },
  {
    name: "Cleaning & Sanitization Chemicals",
    description:"cleaning and sanirization chemicals",
    isActive: true,
  },
  {
    name: "Services",
    description:"services",
    isActive: true,
  },
  {
    name: "Maintenance & Spare Parts",
    description:"maintenance and spare parts",
    isActive: true,
  },
  {
    name: "IT & Software Licenses",
    description:"it and software licenses",
    isActive: true,
  },
  {
    name: "Safety & Personal Protective Equipment (PPE)",
    description:"safety and personal protective equipment",
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
    category:"Active Pharmaceutical Ingredient (API)"
  },
  {

    materialCode: "EXC-TALC",
    description: "Talc Powder - Exipient",
    unitOfMeasure: "KG",
    price: 50,
    currency: "USD",
    isActive: true,
    category:"Excipients"
  },
  {

    materialCode: "PACK-BOTTLE-100ML",
    description: "Amber Bottle 100ml",
    unitOfMeasure: "EA",
    price: 0.5,
    currency: "USD",
    isActive: true,
    category:"Packaging Materials"
  },
  {

    materialCode: "LAB-ETHANOL-99",
    description: "Ethanol 99% Laboratory Reagent",
    unitOfMeasure: "L",
    price: 25,
    currency: "USD",
    isActive: true,
    category:"Laboratory Chemicals"
  },
  {

    materialCode: "PPE-GLOVES",
    description: "Nitrile Gloves",
    unitOfMeasure: "BOX",
    price: 10,
    currency: "USD",
    isActive: true,
    category:"Medical Devices / Instruments"
  },
];