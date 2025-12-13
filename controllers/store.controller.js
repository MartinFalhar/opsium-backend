import { searchInStoreFromDB } from "../models/store.model.js";
import { newInvoiceInsertToDB } from "../models/store.model.js";
import { newTransactionInsertToDB } from "../models/store.model.js";
import { invoicesListFromDB } from "../models/store.model.js";

export async function searchInStore(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const result = await searchInStoreFromDB(req.body, limit, offset, page);

    if (result) {
      res.json(result);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při nahrávání položek ze skladu." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}

export async function newInvoice(req, res) {
  try {
    const result = await newInvoiceInsertToDB(req.body);
    if (result) {           
      res.json(result);
    } else {
      res.json({ message: "Selhání při nahrávání položek ze skladu." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}

export async function newTransaction(req, res) {

  try {
    const result = await newTransactionInsertToDB(req.body);
    if (result) {           
      res.json(result);
    } else {
      res.json({ message: "Selhání při nahrávání nové transakce." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}

export async function invoicesList(req, res) {
  try {
    const invoices = await invoicesListFromDB(req.body);
    if (invoices && invoices.length > 0) {
      res.json(invoices);
    } else {
      res.json({ message: "Selhání při nahrávání zakázek" });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}
