// import { funkce z databaze } from "../models/users.model.js"
import {
  login,
  existUser,
  clientExists,
  insertNewUser,
  insertNewAdmin,
  insertNewOrganization,
  saveOptotypToDB,
  loadOptotypFromDB,
  heroImgInfoFromDB,
  loadClientsFromDB,
  loadAdminsFromDB,
  loadUsersFromDB,
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
