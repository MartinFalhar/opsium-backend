import {
  loadClientsFromDB,
} from "../models/client.model.js";

export async function loadClients(req, res) {
  try {
    const clients = await loadClientsFromDB(req.body);
    if (clients && clients.length > 0) {
      res.json(clients);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při nahrávání klientů" });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}