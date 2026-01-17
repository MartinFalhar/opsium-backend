import pool from "../db/index.js";

export async function searchInStoreFromDB(table, query, id_branch, limit, offset, page) {
  const likePattern = query ? `%${query}%` : `%`;
  
  // Dynamický SQL dotaz - PostgreSQL neumožňuje parametrizaci názvu tabulky,
  // ale table je kontrolováno v kontroleru (pouze 'store_frames' nebo 'store_lens')
  const tableName = table === 'store_frames' ? 'store_frames' : 'store_lens';
  
  try {
    // Hledání řetězce ve všech sloupcích pomocí CAST na text
    // Převedeme celý řádek na text a hledáme v něm
    const { rows: items } = await pool.query(
      `SELECT * FROM ${tableName} 
       WHERE CAST(ROW(${tableName}.*) AS TEXT) ILIKE $1 
       AND id_branch = $2 
       ORDER BY plu DESC 
       LIMIT $3 OFFSET $4`,
      [likePattern, id_branch, limit, offset]
    );
    
    // Zjišťování celkového počtu záznamů
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM ${tableName} 
       WHERE CAST(ROW(${tableName}.*) AS TEXT) ILIKE $1 
       AND id_branch = $2`,
      [likePattern, id_branch]
    );
    
    const totalCount = rows[0]?.total ?? 0;
    const totalPages = Math.ceil(totalCount / limit);
    
    return {
      items,
      totalCount,
      totalPages,
      page,
    };
  } catch (err) {
    console.error("Chyba při načítání ITEMS z STORE:", err);
    throw err;
  }
}

export async function newOrderInsertToDB(order) {
  try {
    const {
      id_client = `${order.id_client}`,
      id_branch = `${order.id_branch}`,
      id_member = `${order.id_member}`,
      attrib = `${order.attrib}`,
      content = `${order.content}`,
      note = `${order.note}`,
    } = order || {};
    await pool.query("BEGIN");

    const userResult = await pool.query(
      "INSERT INTO invoices (id_client, id_branch, id_member, attrib, content, note) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [id_client, id_branch, id_member, attrib, content, note]
    );
    const newInvoiceID = userResult.rows[0].id;
    await pool.query("COMMIT");
    return newInvoiceID;
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

export async function newTransactionInsertToDB(transaction) {
  console.log(transaction);
  try {
    const {
      id_invoice = `${transaction.invoiceID}`,
      attrib = `${transaction.attrib}`,
      price_a = `${transaction.price_a}`,
      vat_a = `${transaction.vat_a}`,
      price_b = `${transaction.price_b}`,
      vat_b = `${transaction.vat_b}`,
      price_c = `${transaction.price_c}`,
      vat_c = `${transaction.vat_c}`,
    } = transaction || {};

    await pool.query("BEGIN");

    const userResult = await pool.query(
      "INSERT INTO transactions (id_invoice, attrib, price_a, vat_a, price_b, vat_b, price_c, vat_c) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
      [id_invoice, attrib, price_a, vat_a, price_b, vat_b, price_c, vat_c]
    );
    const newTransactionID = userResult.rows[0].id;
    await pool.query("COMMIT");
    return newInvoiceID;
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

export async function ordersListFromDB(id_branch) {
  try {
    const result = await pool.query(
      "SELECT * FROM orders WHERE id_branch = $1",
      [id_branch]
    );
    if (result.rows.length > 0) {
      return result.rows;
    } else {
      return []; // or null, based on your needs
    }
  } catch (err) {
    console.error("Chyba při načítání zakázek:", err);
    throw err;
  }
}
