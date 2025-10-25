// import { funkce z databaze } from "../models/users.model.js"
import {
  login,
  existUser,
  insertNewUser,
  saveOptotypToDB,
  loadOptotypFromDB,
  heroImgInfoFromDB,
  loadClientsFromDB,
  adminListFromDB,
  usersListFromDB,
} from "../models/users.model.js";

import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import path from "path";

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
  console.log("BCK Controller> registerUser");
  console.log("BCK Controller> registerUser data:", req.body);
  (await existUser(req.body.email))
    ? console.log("Uživatel již existuje.")
    : await insertNewUser(req.body);
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

export async function heroImgInfo(req, res) {
  try {
    const heroImgData = await heroImgInfoFromDB(req.body);
    if (heroImgData && heroImgData.length > 0) {
      res.json(heroImgData);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání heroImgSet" });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}

export async function heroImg(req, res) {
  const { id } = req.params;
  console.log(`BCK IMG request pro hero ID: ${id}`);

  const __dirname = path.resolve();
  const imagePath = path.join(__dirname, `uploads/hero_img/hero${id}.png`);

  res.sendFile(imagePath, (err) => {
    if (err) {
      console.error("Chyba při odesílání obrázku:", err);
      res.status(404).send("Obrázek nenalezen");
    }
  });
}

export async function loadClients(req, res) {
  try {
    const clients = await loadClientsFromDB(req.body);
    if (clients && clients.length > 0) {
      res.json(clients);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání heroImgSet" });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}

export async function adminList(req, res) {
  try {
    const clients = await adminListFromDB(req.body);
    if (clients && clients.length > 0) {
      res.json(clients);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při nahrávání adminList" });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}

export async function usersList(req, res) {
   
  try {
    const clients = await usersListFromDB(req.body.organization);
    if (clients && clients.length > 0) {
      res.json(clients);
      console.log("BCK Controller> usersList result:", clients);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při nahrávání usersList" });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}
