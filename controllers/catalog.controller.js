import { searchForCLFromDB } from "../models/catalog.model.js";
import { searchForLensFromDB } from "../models/catalog.model.js";
import { searchForSoldropsFromDB } from "../models/catalog.model.js";
import { searchForServicesFromDB } from "../models/catalog.model.js";



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

export async function searchForSoldrops(req, res) {
console.log("searchForSoldrops - req.body:", req.body);
  try {
    const result = await searchForSoldropsFromDB(req.body);

    if (result) {
      res.json(result);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při nahrávání roztoků a kapek z katalogu." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
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