import {
  searchInStoreFromDB
} from "../models/store.model.js";

export async function searchInStore(req, res) {

  try {
    const items = await searchInStoreFromDB(req.body);
    if (items) {

      res.json(items);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při nahrávání položek ze skladu." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}
