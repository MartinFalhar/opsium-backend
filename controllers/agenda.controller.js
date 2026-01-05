import { searchContactsFromDB } from "../models/agenda.model.js";
import { getVatCurrent } from "../models/agenda.model.js";
import { getVatAtDate } from "../models/agenda.model.js";

export async function searchContacts(req, res) {
  try {
    const clients = await searchContactsFromDB(req.body);
    if (clients && clients.length > 0) {
      res.json(clients);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při nahrávání kontaktů" });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}

export async function searchVatCurrent(req, res) {

  try {
    const vat = await getVatCurrent();
    console.log("VAT fetched in controller:", vat);    
    res.json(vat);
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru při načítání DPH" });
  }
}

export async function searchVatAtDate(req, res) {

  try {
    const vat = await getVatAtDate(req.query.date);
    console.log("VAT fetched in controller:", vat);    
    res.json(vat);
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru při načítání DPH" });
  }
}