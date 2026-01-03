import { searchContactsFromDB } from "../models/agenda.model.js";

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
