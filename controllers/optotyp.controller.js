import {
  saveOptotypToDB,
  loadOptotypFromDB,
} from "../models/optotyp.model.js";

import path from "path";

export async function saveOptotyp(req, res) {
  try {
    const saveOptotypSet = await saveOptotypToDB(req.body);
    if (saveOptotypSet[0] == true) {
      res.json({ message: "Uložení proběhlo v pořádku" });
    } else {
      res.json({ message: "Selhání" });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}

export async function loadOptotyp(req, res) {
  try {
    const loadOptotypSet = await loadOptotypFromDB(req.body);
    if (loadOptotypSet && loadOptotypSet.length > 0) {
      res.json(loadOptotypSet);
      // , { message: "Nahrání proběhlo v pořádku" });
    } else {
      res.json({ message: "Selhání" });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}