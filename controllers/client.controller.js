import {
  loadClientsFromDB,
  insertNewClient,
  existClient,
  saveExaminationToDB,
} from "../models/client.model.js";

export async function loadClients(req, res) {
  try {
    const clients = await loadClientsFromDB(req.body);
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
    await insertNewClient(req.body);
  } catch (error) {
    console.error("Chyba při registraci klienta:", error);
    res.status(500).send("Nastala chyba při registraci klienta.");
  }
}

export async function saveExamination(req, res) {
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
    await insertNewClient(req.body);
  } catch (error) {
    console.error("Chyba při registraci klienta:", error);
    res.status(500).send("Nastala chyba při registraci klienta.");
  }
}
