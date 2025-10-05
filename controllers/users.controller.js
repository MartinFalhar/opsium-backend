// import { funkce z databaze } from "../models/users.model.js"
import {
  login,
  existUser,
  insertNewUser,
  saveOptotypToDB,
  loadOptotypFromDB,
} from "../models/users.model.js";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";

export async function indexPage(req, res) {
  try {
    res.render("index.ejs");
  } catch (error) {
    res.render("index.ejs", { content: JSON.stringify(error.response?.data) });
  }
}

export async function loginPage(req, res) {
  console.log("Controller> loginPage");
  try {
    res.render("login.ejs");
  } catch (error) {
    res.render("login.ejs", { secret: JSON.stringify(error.response.data) });
  }
}

export async function loginUser(req, res) {
  console.log("BCK Controller> loginUser");
  try {
    const loginProceed = await login(req.body.email, req.body.password);
    console.log("BCK Login proceed:", loginProceed.id);
    if (loginProceed.id > 0) {
      // vracíme uživatele, pokud je přihlášení úspěšné
      res.json(loginProceed);
    } else {
      res.json({ success: false, message: "Přihlášení NEúspěšné" });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}

export async function registerUser(req, res) {
  (await existUser(req.body.email))
    ? console.log("Uživatel již existuje.")
    : await insertNewUser(req.body.email, req.body.password);
  res.render("login.ejs");
}

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
