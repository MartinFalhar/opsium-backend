import { searchForCLFromDB } from "../models/catalog.model.js";


export async function searchForCL(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const result = await searchForCLFromDB(req.body, limit, offset, page);

    if (result) {
      res.json(result);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při nahrávání kontaktních čoček z katalogu." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}
