import { searchForCLFromDB } from "../models/catalog.model.js";
import { searchForLensFromDB } from "../models/catalog.model.js";


export async function searchForCL(req, res) {


  try {
    const result = await searchForCLFromDB(req.body);

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



export async function searchForLens(req, res) {

  try {
    const result = await searchForLensFromDB(req.body);

    if (result) {
      res.json(result);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při nahrávání brýlových čoček z katalogu." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
} 