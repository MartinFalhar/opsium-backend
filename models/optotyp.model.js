import pool from "../db/index.js";


export async function saveOptotypToDB(body) {
  console.log(body);
  try {
    await pool.query(
      "INSERT INTO optotyp (users_id, optotyp_set) VALUES ($1, $2::jsonb)",
      [JSON.stringify(body.userId), JSON.stringify(body.tests)]
    );
  } catch (err) {
    console.error("Chyba při ukládání optotypu:", err);
    throw err;
  }
}

export async function loadOptotypFromDB(body) {
  try {
    const result = await pool.query(
      "SELECT optotyp_set FROM optotyp WHERE users_id = $1",
      [JSON.stringify(body.userId)]
    );
    // Pokud očekáváš jeden záznam:
    if (result.rows.length > 0) {
      // optotyp_set je už objekt (pokud je sloupec JSONB)
      return result.rows.map((row) => row.optotyp_set);
    } else {
      return null; // nebo [], podle potřeby
    }
  } catch (err) {
    console.error("Chyba při ukládání optotypu:", err);
    throw err;
  }
}
