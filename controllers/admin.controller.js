import {
  existUser,
  insertNewUser,
  insertNewAdmin,
  insertNewOrganization,
  loadAdminsFromDB,
  loadUsersFromDB,
} from "../models/admin.model.js";

import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import path from "path";


export async function createAdmin(req, res) {
  try {
    //Nejdříve zkontrolujeme, jestli uživatel s daným emailem již existuje
    //Z req.body vezmeme email

    const { email } = req.body;
    const userExists = await existUser(email);

    //Pokud je uživatel nalezen, vrátíme chybu
    if (userExists) {
      console.log("Uživatel již existuje.");
      return res.status(400).send("Uživatel již existuje.");
    }

    //Nový uživatel neexistuje, pokračujeme v registraci
   await insertNewAdmin(req.body);

    //pokud je to superadmin (rights 10), vytvoříme i organizaci
    // req.body.rights === 10 && (await insertNewOrganization(req.body));

    res.render("login.ejs");
  } catch (error) {
    console.error("Chyba při registraci uživatele:", error);
    res.status(500).send("Nastala chyba při registraci uživatele.");
  }
}


export async function createUser(req, res) {
  try {
    //Nejdříve zkontrolujeme, jestli uživatel s daným emailem již existuje
    //Z req.body vezmeme email
    const { email } = req.body;
    const userExists = await existUser(email);

    //Pokud je uživatel nalezen, vrátíme chybu
    if (userExists) {
      console.log("Uživatel již existuje.");
      return res.status(400).send("Uživatel již existuje.");
    }

    //Nový uživatel neexistuje, pokračujeme v registraci
    const newAdminID = await insertNewUser(req.body);

    //pokud je to superadmin (rights 10), vytvoříme i organizaci
    req.body.rights === 10 && (await insertNewOrganization(req.body));

    res.render("login.ejs");
  } catch (error) {
    console.error("Chyba při registraci uživatele:", error);
    res.status(500).send("Nastala chyba při registraci uživatele.");
  }
}

export async function adminsList(req, res) {
  try {
    const clients = await loadAdminsFromDB(req.body);
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
    const clients = await loadUsersFromDB(req.body.organization);
    //smazáno clients.length > 0 &&
    if (clients) {
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

export async function createClient(req, res) {
  try {
    //Nejdříve zkontrolujeme, jestli uživatel s daným emailem již existuje
    //Z req.body vezmeme email
    const { email } = req.body;
    const clientExists = await existClient(email);
    //Pokud je uživatel nalezen, vrátíme chybu
    if (clientExists) {
      console.log("Uživatel již existuje.");
      return res.status(400).send("Uživatel již existuje.");
    }
    //Pokud uživatel neexistuje, vytvoříme nového
    const newClientID = await insertNewUser(req.body);
    res.json({ message: "Uživatel byl úspěšně vytvořen.", userID: newClientID });
  } catch (error) {
    console.error("Chyba při vytváření uživatele:", error);
    res.status(500).send("Nastala chyba při vytváření uživatele.");
  }
}

export async function createBranch(req, res) {
  try {
    //Nejdříve zkontrolujeme, jestli uživatel s daným emailem již existuje    
    //Z req.body vezmeme email
    const { email } = req.body;
    const userExists = await existUser(email);
    //Pokud je uživatel nalezen, vrátíme chybu
    if (userExists) {
      console.log("Uživatel již existuje.");
      return res.status(400).send("Uživatel již existuje.");
    }
    //Pokud uživatel neexistuje, vytvoříme nového
    const newClientID = await insertNewUser(req.body);
    res.json({ message: "Uživatel byl úspěšně vytvořen.", userID: newClientID });
  } catch (error) {
    console.error("Chyba při vytváření uživatele:", error);
    res.status(500).send("Nastala chyba při vytváření uživatele.");
  }
}
