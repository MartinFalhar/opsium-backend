import pool from "../db/index.js";

export async function searchContactsFromDB(body) {
  console.log("Searching contacts with:", body.value);
  console.log("User organization ID:", body.organization_id);
  try {
    const result = await pool.query(
      "SELECT * FROM contacts WHERE $1 = organization_id AND contacts::text ILIKE '%' || $2 || '%';",
      [body.organization_id, body.value]
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
    const { rows: items } = await pool.query("SELECT * FROM agenda_services WHERE branch_id = $1 ORDER BY plu;", [body.branch_id]);
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

    const getNextPlu = await pool.query("SELECT MAX(plu) AS max_plu FROM agenda_services WHERE branch_id = $1;", [body.branch_id]);

    console.log("Next PLU value:", getNextPlu.rows[0].max_plu + 1);

    body.plu = getNextPlu.rows[0].max_plu + 1;

    sqlCommand = "INSERT INTO agenda_services (plu, name, amount, uom, price, vat_type, note, category, branch_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) RETURNING *;";
    params = [body.plu, body.name, body.amount, body.uom, body.price, body.vat_type, body.note, body.category, body.branch_id];
  } else {
    sqlCommand = "UPDATE agenda_services SET name = $1, amount = $2, uom = $3, price = $4, vat_type = $5, note = $6, category = $7, branch_id = $8, updated_at = NOW() WHERE id = $9 AND branch_id = $8 RETURNING *;";
    params = [body.name, body.amount, body.uom, body.price, body.vat_type, body.note, body.category, body.branch_id, body.id];
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

export async function deleteServicesInDB(id, branch_id) {

  console.log("Deleting service with ID:", id); 
    try {
    //hledání řetězce
    const deleteItem  = await pool.query("DELETE FROM agenda_services WHERE id = $1 AND branch_id = $2 RETURNING id;", [id, branch_id]);
    console.log("Deleted item:", deleteItem.rows);
    return deleteItem.rows;
  } catch (err) {
    console.error("Chyba při načítání služeb z katalogu:", err);
    throw err;
  }
}

export async function getDashboardDataFromDB(branch_id) {
  try {
    const normalizedBranchId = Number(branch_id);
    if (!Number.isFinite(normalizedBranchId) || normalizedBranchId <= 0) {
      throw new Error("branch_id je povinné");
    }

    const closedOrdersResult = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM orders
       WHERE branch_id = $1
         AND status = 'confirmed'::order_status`,
      [normalizedBranchId],
    );

    const latestOrdersResult = await pool.query(
      `SELECT
         o.id,
         o.created_at,
         o.status,
         c.name,
         c.surname
       FROM orders o
       LEFT JOIN clients c ON c.id = o.client_id
       WHERE o.branch_id = $1
       ORDER BY o.created_at DESC
       LIMIT 5`,
      [normalizedBranchId],
    );

    const transactionsTotalResult = await pool.query(
      `SELECT
         COALESCE(SUM(COALESCE(t.price_a, 0) + COALESCE(t.price_b, 0) + COALESCE(t.price_c, 0)), 0)::numeric AS total
       FROM transactions t
       INNER JOIN orders o ON o.id = t.order_id
       WHERE o.branch_id = $1`,
      [normalizedBranchId],
    );

    const storeCountResult = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM store_frames WHERE branch_id = $1) AS store_frames,
         (SELECT COUNT(*)::int FROM store_sunglasses WHERE branch_id = $1) AS store_sunglasses,
         (SELECT COUNT(*)::int FROM store_lens WHERE branch_id = $1) AS store_lens,
         (SELECT COUNT(*)::int FROM store_cl WHERE branch_id = $1) AS store_cl,
         (SELECT COUNT(*)::int FROM store_goods WHERE branch_id = $1) AS store_goods`,
      [normalizedBranchId],
    );

    return {
      closedOrdersCount: Number(closedOrdersResult.rows[0]?.count ?? 0),
      latestOrders: latestOrdersResult.rows,
      transactionsTotal: Number(transactionsTotalResult.rows[0]?.total ?? 0),
      stockCounts: storeCountResult.rows[0] || {
        store_frames: 0,
        store_sunglasses: 0,
        store_lens: 0,
        store_cl: 0,
        store_goods: 0,
      },
    };
  } catch (err) {
    console.error("Chyba při načítání dashboard dat:", err);
    throw err;
  }
}