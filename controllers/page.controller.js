import {
  login,
  heroImgInfoFromDB,
} from "../models/page.model.js";

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
    console.log("999Controller> loginUser");
  try {
    const loginProceed = await login(req.body.email, req.body.password);
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