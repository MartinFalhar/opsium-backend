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

export async function getVatCurrent() {
  console.log("Fetching current VAT rate");
  try {
    const result = await pool.query("SELECT * FROM vat_rates WHERE valid_from <= CURRENT_DATE AND (valid_to IS NULL OR valid_to >= CURRENT_DATE);");
    if (result.rows.length > 0) {
      console.log("VAT query result:", result.rows);
      return result.rows; 
    } else {
      return null; 
    }
  } catch (err) {
    console.error("Chyba při načítání aktuální sazby DPH:", err);
    throw err;
  }
} 

export async function getVatAtDate(date) {
  console.log("Fetching VAT rate at date:", date);
  try {
    const result = await pool.query("SELECT * FROM vat_rates WHERE valid_from <= $1 AND (valid_to IS NULL OR valid_to >= $1);", [date]);
    if (result.rows.length > 0) {
      console.log("VAT query result:", result.rows);
      return result.rows; 
    } else {
      return null; 
    }
  } catch (err) {
    console.error("Chyba při načítání sazby DPH k datu:", err);
    throw err;
  }
}