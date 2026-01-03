import pool from "../db/index.js";

export async function searchContactsFromDB(body) {
        console.log("Searching contacts with:", body.value);
      console.log("User organization ID:", body.id_organizations);
  try {    
    const result = await pool.query(
      "SELECT * FROM contacts WHERE $1 = id_organizations AND contacts::text ILIKE '%' || $2 || '%';",
      [body.id_organizations, body.value]
    ); // Add filtering based on body if needed
    if (result.rows.length > 0) {
      return result.rows;
    } else {
      return []; // or null, based on your needs
    }
  } catch (err) {
    console.error("Chyba při načítání kontaktů:", err);
    throw err;
  }
}
