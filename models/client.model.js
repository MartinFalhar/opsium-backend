import pool from "../db/index.js";

export async function loadClientsFromDB(body) {
  try {
    // const result = await pool.query(
    //   "SELECT * FROM clients WHERE organization_id = $1",
    //   [body.organization_id]
    // ); // Add filtering based on body if needed
    console.log("BCKD loadClientsFromDB body:", body.branch_id);
    const result = await pool.query(
      "SELECT c.* FROM clients c JOIN clients_branches bc ON c.id = bc.client_id WHERE bc.branch_id = $1",
      [body.branch_id]
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
      organization_id,
    } = client || {};

    await pool.query("BEGIN");

    const clientResult = await pool.query(
      "INSERT INTO clients (degree_before, name, surname, degree_after, birth_date, organization_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [degree_before, name, surname, degree_after, birth_date, organization_id]
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
      client_id: client_id,
      branch_id: branch_id,
      member_id: member_id,
      name: name,
      data: data,
    } = newExamDataSet || {};

    //Existuje-li záznam s daným jménem pro tohoto klienta, většinou se jedná o aktualizaci

    const existingExamination = await pool.query(
      "SELECT id FROM examinations WHERE client_id = $1 AND name = $2",
      [client_id, name]
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
      "INSERT INTO examinations (client_id, branch_id, member_id, name, data) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [client_id, branch_id, member_id, name, data]
    );

    await pool.query("COMMIT");
    console.log("BCKD Saved Examination ID:", saveExamination.rows[0].id);
    return saveExamination.rows[0].id;
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

export async function loadExamsListFromDB(loadInfo) {
  try {
    const { client_id, branch_id } = loadInfo || {};
    console.log(
      "BCKD MODUL loadExamsList called with:",
      client_id,
      branch_id
    );
    await pool.query("BEGIN");

    const examsList = await pool.query(
      "SELECT name FROM examinations  WHERE client_id = $1 AND branch_id = $2 ORDER BY name DESC",
      [client_id, branch_id]
    );

    await pool.query("COMMIT");
    console.log("BCKD Loaded Exams List:", examsList.rows);
    return examsList.rows;
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

export async function loadExaminationFromDB(loadInfo) {
  try {
    const { client_id, branch_id, name_id } = loadInfo || {};
    console.log(
      "BCKD MODUL loadExamination called with:",
      client_id,
      branch_id,
      name_id
    );
    await pool.query("BEGIN");

    const examination = await pool.query(
      "SELECT data FROM examinations  WHERE client_id = $1 AND branch_id = $2 AND name = $3",
      [client_id, branch_id, name_id]
    );

    await pool.query("COMMIT");
    console.log("BCKD Loaded Examination", examination.rows[0]);
    return examination.rows[0];
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}
