import pool from "../db/index.js";

export async function loadClientsFromDB(body) {
  try {
    // const result = await pool.query(
    //   "SELECT * FROM clients WHERE id_organizations = $1",
    //   [body.id_organizations]
    // ); // Add filtering based on body if needed
    console.log("BCKD loadClientsFromDB body:", body.id_branch);
    const result = await pool.query(
      "SELECT c.* FROM clients c JOIN clients_branches bc ON c.id = bc.id_clients WHERE bc.id_branches = $1",
      [body.id_branch]
    ); // Add filtering based on body if needed
    if (result.rows.length > 0) {
      return result.rows;
    } else {
      return []; // or null, based on your needs
    }
  } catch (err) {
    console.error("Chyba při načítání klientů:", err);
    throw err;
  }
}

export async function existClient(name, surname, birth_date) {
  try {
    const result = await pool.query(
      "SELECT name, surname, birth_date FROM clients WHERE name = $1 AND surname = $2 AND birth_date = $3",
      [name, surname, birth_date]
    );
    console.log("Existence klienta:", result.rows.length > 0);
    return result.rows.length > 0;
  } catch (err) {
    console.error("Chyba při kontrole existence klienta:", err);
    throw err;
  }
}

export async function insertNewClient(client) {
  try {
    const {
      degree_before,
      name,
      surname,
      degree_after,
      birth_date,
      id_organizations,
    } = client || {};

    await pool.query("BEGIN");

    const clientResult = await pool.query(
      "INSERT INTO clients (degree_before, name, surname, degree_after, birth_date, id_organizations) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [degree_before, name, surname, degree_after, birth_date, id_organizations]
    );
    const newClientID = clientResult.rows[0].id;
    console.log("BCKD New Client ID:", newClientID);
    await pool.query("COMMIT");
    return newClientID;
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

export async function saveExaminationToDB(newExamDataSet) {
  console.log("BCKD saveExaminationToDB:", newExamDataSet);
  try {
    const {
      id_clients: id_clients,
      id_branches: id_branches,
      id_members: id_members,
      name: name,
      data: data,
    } = newExamDataSet || {};

    //Existuje-li záznam s daným jménem pro tohoto klienta, většinou se jedná o aktualizaci

    const existingExamination = await pool.query(
      "SELECT id FROM examinations WHERE id_clients = $1 AND name = $2",
      [id_clients, name]
    );

    await pool.query("BEGIN");

    if (existingExamination.rows.length > 0) {
      // Update existing record
      await pool.query("UPDATE examinations SET data = $1 WHERE id = $2", [
        data,
        existingExamination.rows[0].id,
      ]);
      await pool.query("COMMIT");
      return existingExamination.rows[0].id;
    }

    await pool.query("BEGIN");
    const saveExamination = await pool.query(
      "INSERT INTO examinations (id_clients, id_branches, id_members, name, data) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [id_clients, id_branches, id_members, name, data]
    );

    await pool.query("COMMIT");
    console.log("BCKD Saved Examination ID:", saveExamination.rows[0].id);
    return saveExamination.rows[0].id;
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

export async function loadExamsFromDB(loadInfo) {
  try {
    const { id_clients, id_branches } = loadInfo || {};
    console.log(
      "BCKD MODUL loadExamsList called with:",
      id_clients,
      id_branches
    );
    await pool.query("BEGIN");

    const examsList = await pool.query(
      "SELECT name FROM examinations  WHERE id_clients = $1 AND id_branches = $2 ORDER BY name DESC",
      [id_clients, id_branches]
    );

    await pool.query("COMMIT");
    console.log("BCKD Loaded Exams List:", examsList.rows);
    return examsList.rows;
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}
