// import { funkce z databaze } from "../models/users.model.js"
import { login, existUser, insertNewUser } from "../models/users.model.js";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
// app.use(bodyParser.urlencoded({ extended: true }));

export async function indexPage(req, res) {
  console.log("Controller> indexPage");
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
  //const users = await getUsersFromDB();
  //res.json(users);
}

export async function loginUser(req, res) {
  console.log("BCK Controller> loginUser");
  console.log("BCK BODY:", req.body); // <--- důležité

  try {
    const loginProceed = await login(req.body.email, req.body.password);
    console.log("BCK Login proceed:", loginProceed.id);
    if (loginProceed.id > 0) {
      // res.render("index.ejs", { login: req.body.email });
      res.json(loginProceed); // vracíme uživatele, pokud je přihlášení úspěšné
    } else {
      // res.render("login.ejs", {
      //   errorMessage: "Incorrect login details, bro...",
      // });
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
  console.log("BCK Controller> saveOptotyp");
  console.log("BCK BODY:", req.body); // <--- důležité  
}
