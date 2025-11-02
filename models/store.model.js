import pool from "../db/index.js";

export async function searchInStoreFromDB(body) {

  try {

    const minRights = 10;
    const page = 1; // stránka, kterou chceme zobrazit (1 = první stránka)
    const pageSize = 10; // kolik záznamů na stránku
    const offset = (page - 1) * pageSize;

    const result = await pool.query("SELECT * FROM store WHERE collection = $1 ORDER BY ean DESC LIMIT $2 OFFSET $3", [body.searchText, pageSize, offset]); // Add filtering based on body if needed

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
