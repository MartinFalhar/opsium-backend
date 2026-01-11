import { searchContactsFromDB } from "../models/agenda.model.js";
import { getVatCurrent } from "../models/agenda.model.js";
import { getVatAtDate } from "../models/agenda.model.js";
import { searchForServicesFromDB } from "../models/agenda.model.js";
import { updateServicesInDB } from "../models/agenda.model.js";

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

export async function searchForServices(req, res) {

  try {
    const result = await searchForServicesFromDB(req.body);

    if (result) {
      res.json(result);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při nahrávání služeb z katalogu." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
} 

export async function updateServices(req, res) {
  try {
    const result = await updateServicesInDB(req.body.changedItem);

    if (result) {
      res.json(result);
      console.log("Services updated in controller:", result);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při změně služeb v katalogu." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
} 

