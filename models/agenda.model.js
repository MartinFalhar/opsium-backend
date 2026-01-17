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

  try {
    const result = await pool.query(
      "SELECT * FROM vat_rates WHERE valid_from <= CURRENT_DATE AND (valid_to IS NULL OR valid_to >= CURRENT_DATE);"
    );
    if (result.rows.length > 0) {

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
  console.log("Updating/Inserting service:", body.plu);
  
  let sqlCommand;
  let params;
  
  //Pokud je plu 0, jedná se o vložení nové položky, jinak aktualizaci stávající
  if (body.plu === "") {

    const getNextPlu = await pool.query("SELECT MAX(plu) AS max_plu FROM agenda_services WHERE id_branches = $1;", [body.id_branch]);

    console.log("Next PLU value:", getNextPlu.rows[0].max_plu + 1);

    body.plu = getNextPlu.rows[0].max_plu + 1;

    sqlCommand = "INSERT INTO agenda_services (plu, name, amount, uom, price, vat_type, note, category, id_branches, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) RETURNING *;";
    params = [body.plu, body.name, body.amount, body.uom, body.price, body.vat_type, body.note, body.category, body.id_branch];
  } else {
    sqlCommand = "UPDATE agenda_services SET name = $1, amount = $2, uom = $3, price = $4, vat_type = $5, note = $6, category = $7, id_branches = $8, updated_at = NOW() WHERE id = $9 AND id_branches = $8 RETURNING *;";
    params = [body.name, body.amount, body.uom, body.price, body.vat_type, body.note, body.category, body.id_branch, body.id];
  }

  try {
    const { rows: items } = await pool.query(sqlCommand, params);
    console.log("Query result:", items);
    return items;
  } catch (err) {
    console.error("Chyba při ukládání služby do databáze:", err);
    throw err;
  }
}

export async function deleteServicesInDB(id, id_branch) {

  console.log("Deleting service with ID:", id); 
    try {
    //hledání řetězce
    const deleteItem  = await pool.query("DELETE FROM agenda_services WHERE id = $1 AND id_branches = $2 RETURNING id;", [id, id_branch]);
    console.log("Deleted item:", deleteItem.rows);
    return deleteItem.rows;
  } catch (err) {
    console.error("Chyba při načítání služeb z katalogu:", err);
    throw err;
  }
}