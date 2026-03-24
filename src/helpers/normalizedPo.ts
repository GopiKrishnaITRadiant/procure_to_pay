import { PO,OptimizedPO, OptimizedPOAcknowledgment } from "../types/customTypes";

export function optimizePO(po: PO): OptimizedPO {
  return {
    // __metadata: po.__metadata,
    Ebeln: po.Ebeln,
    Plant: po.Plant,
    Name1: po.Name1,
    Del_sts: po.Del_sts,
    menge: po.menge,
    Conf_qty: po.Conf_qty,
    Netpr: po.Netpr,
    Asn_sts: po.Asn_sts,
    Bedat: po.Bedat,
    Eknam: po.Eknam,
    Smtp_addr: po.Smtp_addr,
    // Region: po.Region,
    City: po.City,
    Country: po.Country,
    Delivery_Dt: po.Delivery_Dt,
    Vendor_mail1: po.Vendor_mail1,
    Vendor_mail2: po.Vendor_mail2,
    Vendor_mail3: po.Vendor_mail3,
    Vendor_mail4: po.Vendor_mail4,
    Mail_ind: po.Mail_ind,
    Mail_ind_1: po.Mail_ind_1,
    Mail_ind_2: po.Mail_ind_2,
    Mail_ind_3: po.Mail_ind_3,
    Mail_ind_4: po.Mail_ind_4,
    PO_itemSet: {
      results: po.PO_itemSet.results.map(item => ({
        // __metadata: item.__metadata,
        Ebeln: item.Ebeln,
        Ebelp: item.Ebelp,
        Charg: item.Charg,
        Idnlf: item.Idnlf,
        Matnr: item.Matnr,
        Maktx: item.Maktx,
        Menge: item.Menge,
        Meins: item.Meins,
        Uebto: item.Uebto,
        Peinh: item.Peinh,
        Netpr: item.Netpr,
        Netwr: item.Netwr,
        Eindt: item.Eindt,
        Del_qty: item.Del_qty,
        Budat: item.Budat,
        Open_qty: item.Open_qty,
        Dmbtr: item.Dmbtr,
        Inv_dt: item.Inv_dt,
        Mvt_type: item.Mvt_type,
        Del_sts: item.Del_sts,
        Parking_status: item.Parking_status,
        Parked_qty: item.Parked_qty,
        Plant: item.Plant,
        // Max_qty: item.Max_qty,
        // Min_qty: item.Min_qty,
        Mail_ind: item.Mail_ind,
        Mail_ind_1: item.Mail_ind_1,
        Mail_ind_2: item.Mail_ind_2,
        Mail_ind_3: item.Mail_ind_3,
        Mail_ind_4: item.Mail_ind_4
      }))
    },
    UOM_CONVSet: {
      results: po.UOM_CONVSet.results.map(conv => ({
        // __metadata: conv.__metadata,
        PO_Num: conv.PO_Num,
        Material: conv.Material,
        Alt_Unit: conv.Alt_Unit,
        Numerator: conv.Numerator,
        Denominator: conv.Denominator,
        // UOM_Desc: conv.UOM_Desc
      }))
    }
  };
}

export function optimizePOAcknowledgment(po: OptimizedPOAcknowledgment) {
  return {
    Ebeln: po.Ebeln,
    Del_sts: po.Del_sts,

    Delivery_Dt: po.Delivery_Dt,

    PO_itemSet: {
      results: (po.PO_itemSet?.results || []).map(item => ({
        Ebeln: item.Ebeln,
        Ebelp: item.Ebelp,

        Matnr: item.Matnr,
        Idnlf: item.Idnlf,

        Menge: item.Menge,
        Netpr: item.Netpr,
        Peinh: item.Peinh,

        Meins: item.Meins,
        Eindt: item.Eindt,

        Del_sts: item.Del_sts
      }))
    },

    UOM_CONVSet: {
      results: (po.UOM_CONVSet?.results || []).map(conv => ({
        PO_Num: conv.PO_Num,
        Material: conv.Material,
        Alt_Unit: conv.Alt_Unit,
        Numerator: conv.Numerator,
        Denominator: conv.Denominator
      }))
    }
  };
}
