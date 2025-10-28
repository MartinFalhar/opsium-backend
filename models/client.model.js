import pool from "../db/index.js";

export async function loadClientsFromDB(body) {
  try {
    const result = await pool.query("SELECT * FROM clients"); // Add filtering based on body if needed
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