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
    const result = await pool.query(
      "SELECT * FROM vat_rates WHERE valid_from <= CURRENT_DATE AND (valid_to IS NULL OR valid_to >= CURRENT_DATE);"
    );
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
  try {
    const result = await pool.query(
      "SELECT * FROM vat_rates WHERE valid_from <= $1 AND (valid_to IS NULL OR valid_to >= $1);",
      [date]
    );
    if (result.rows.length > 0) {
      return result.rows;
    } else {
      return null;
    }
  } catch (err) {
    console.error("Chyba při načítání sazby DPH k datu:", err);
    throw err;
  }
}

export async function searchForServicesFromDB(body) {
     console.log("Searching services in agenda catalog...");
  try {
    //hledání řetězce
    const { rows: items } = await pool.query("SELECT * FROM agenda_services WHERE id_branches = $1 ORDER BY plu;", [body.id_branch]);
    return items;
  } catch (err) {
    console.error("Chyba při načítání služeb z katalogu:", err);
    throw err;
  }
}

export async function updateServicesInDB(body) {
     console.log("UPDATING services in agenda catalog...");
     console.log("Data to update:", body);
  try {
    //hledání řetězce
    const { rows: items } = await pool.query("UPDATE agenda_services SET plu = $1, name = $2, amount = $3, uom = $4, price = $5, vat_type = $6, note = $7, category = $8, id_branches = $9, updated_at = NOW() WHERE id = $10 AND id_branches = $9;", [body.plu, body.name, body.amount, body.uom, body.price, body.vat_type, body.note, body.category, body.id_branch, body.id]);
    return items;
  } catch (err) {
    console.error("Chyba při načítání služeb z katalogu:", err);
    throw err;
  }
}

