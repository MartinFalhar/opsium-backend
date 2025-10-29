import pool from "../db/index.js";

export async function loadClientsFromDB(body) {
  try {
    const result = await pool.query("SELECT * FROM clients WHERE id_user = $1", [body.userId]); // Add filtering based on body if needed
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
  console.log("BCKD insertNewClient:", client);
  try {
    const { degree_front, name, surname, degree_post, birth_date, id_user } =
      client || {};

    await pool.query("BEGIN");

    const clientResult = await pool.query(
      "INSERT INTO clients (degree_front, name, surname, degree_post, birth_date, id_user) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [degree_front, name, surname, degree_post, birth_date, id_user]
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
