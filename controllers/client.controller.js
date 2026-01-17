import {
  loadClientsFromDB,
  insertNewClient,
  existClient,
  saveExaminationToDB,
  loadExamsListFromDB,
  loadExaminationFromDB,
} from "../models/client.model.js";

export async function loadClients(req, res) {
  try {
    // id_branch nyní bereme z JWT tokenu, který je dekódován v middleware
    const clients = await loadClientsFromDB({ id_branch: req.user.id_branch });
    if (clients && clients.length > 0) {
      res.json(clients);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při nahrávání klientů" });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}

export async function createClient(req, res) {
  try {
    //Nejdříve zkontrolujeme, jestli uživatel s daným emailem již existuje
    //Z req.body vezmeme name, surname, birth_date
    const { name, surname, birth_date } = req.body;
    const userExists = await existClient(req.body);

    //Pokud je uživatel nalezen, vrátíme chybu
    if (userExists) {
      console.log("Klient již existuje.");
      return res.status(400).send("Klient již existuje.");
    }

    //Nový uživatel neexistuje, pokračujeme v registraci
    // Přidáme id_branch z JWT tokenu
    await insertNewClient({ ...req.body, id_branch: req.user.id_branch });
  } catch (error) {
    console.error("Chyba při registraci klienta:", error);
    res.status(500).send("Nastala chyba při registraci klienta.");
  }
}

export async function saveExamination(req, res) {
  try {
    // console.log("BCKD saveExamination called with:", req.body);

    //Nový uživatel neexistuje, pokračujeme v registraci
    // Přidáme id_branch z JWT tokenu
    const examSave = await saveExaminationToDB({ ...req.body, id_branches: req.user.id_branch });
    res.json(examSave);
  } catch (error) {
    console.error("Chyba při registraci klienta:", error);
    res.status(500).send("Nastala chyba při registraci klienta.");
  }
}

export async function loadExamsList(req, res) {
  try {
    // Přidáme id_branch z JWT tokenu
    const examsList = await loadExamsListFromDB({ ...req.body, id_branches: req.user.id_branch });
    res.json(examsList);
  } catch (error) {
    console.error("Chyba při registraci klienta:", error);
    res.status(500).send("Nastala chyba při registraci klienta.");
  }
}

export async function loadExamination(req, res) {
  try {
    // Přidáme id_branch z JWT tokenu
    const examination = await loadExaminationFromDB({ ...req.body, id_branches: req.user.id_branch });
    res.json(examination);
  } catch (error) {
    console.error("Chyba při registraci klienta:", error);
    res.status(500).send("Nastala chyba při registraci klienta.");
  }
}
