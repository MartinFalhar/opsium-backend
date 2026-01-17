import { searchContactsFromDB } from "../models/agenda.model.js";
import { getVatCurrent } from "../models/agenda.model.js";
import { getVatAtDate } from "../models/agenda.model.js";
import { searchForServicesFromDB } from "../models/agenda.model.js";
import { updateServicesInDB } from "../models/agenda.model.js";
import { deleteServicesInDB } from "../models/agenda.model.js";

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

    res.json(vat);
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru při načítání DPH" });
  }
}

export async function searchVatAtDate(req, res) {

  try {
    const vat = await getVatAtDate(req.query.date);
 
    res.json(vat);
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru při načítání DPH" });
  }
}

export async function searchForServices(req, res) {

  try {
    // Přidáme id_branch z JWT tokenu
    const result = await searchForServicesFromDB({ id_branch: req.user.id_branch });

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
  console.log("Received request to update services:", req.body.changedItem.plu);
  try {
    // Přidáme id_branch z JWT tokenu
    const result = await updateServicesInDB({ ...req.body.changedItem, id_branch: req.user.id_branch });

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

export async function deleteServices(req, res) {
  console.log("Received request to delete service:", req.body.id);
 try {
    // id_branch nyní bereme z JWT tokenu
    const result = await deleteServicesInDB(req.body.id, req.user.id_branch);

    if (result) {
      res.json(result);
      console.log("Services deleted in controller:", result);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při změně služeb v katalogu." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
} 
