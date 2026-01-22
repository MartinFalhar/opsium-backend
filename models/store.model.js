import pool from "../db/index.js";

export async function putInStoreDB(
  id_branch,
  plu,
  id_supplier,
  delivery_note,
  quantity,
  price_buy,
  date,
) {

  // Najdi id_store_item podle PLU a id_branch
  const findItemSQL = "SELECT id_store_item FROM store_frames WHERE plu = $1 AND id_branch = $2";
  
  const documentSQL =
    "INSERT INTO store_documents (id_branch, id_supplier, type, delivery_note, received_at) VALUES ($1, $2, $3, $4, $5) RETURNING id";
  const documentValues = [
    id_branch, // $1
    id_supplier, // $2
    "receipt", // $3
    delivery_note, // $4
    date, // $5
  ];

  const batchSQL = `INSERT INTO store_batches (store_documents_id, purchase_price, quantity_received, id_store_item) VALUES ($1, $2, $3, $4)`;

  try {
    await pool.query("BEGIN");

    // Najdi id_store_item podle PLU
    const itemResult = await pool.query(findItemSQL, [plu, id_branch]);
    
    if (itemResult.rows.length === 0) {
      await pool.query("ROLLBACK");
      throw new Error(`Položka s PLU ${plu} nebyla nalezena`);
    }
    
    const id_store_item = itemResult.rows[0].id_store_item;

    console.log("Found id_store_item:", id_store_item);

    // Vkládání záznamu do store_documents (dodací list)
    const docResult = await pool.query(documentSQL, documentValues);
    const id_document = docResult.rows[0].id;
    console.log("Document inserted with ID:", id_document);

    // Vkládání záznamu do store_batches (šarže naskladnění)
    const batchValues = [
      id_document, // $1 - store_documents_id
      price_buy, // $2 - purchase_price
      quantity, // $3 - quantity_received
      id_store_item, // $4 - id_store_item
    ];
    console.log("Batch inserted for id_store_item:", id_store_item);
    await pool.query(batchSQL, batchValues);

    await pool.query("COMMIT");
    return { success: true, message: "Položka byla úspěšně naskladněna" };
  } catch (err) {
    console.error("Chyba při naskladňování položky:", err);
    await pool.query("ROLLBACK");
    throw err;
  }
}

export async function updateIteminDB(
  updatedItem,
  table,
  id_branch,
  id_organization,
) {
  const tableName = table === 1 ? "store_frames" : "";
  let commandSQL = "";
  let values = [];

  console.log("Updating item in table:", updatedItem.id_supplier);

  if (table === 1 && updatedItem.plu !== "") {
    commandSQL = `UPDATE ${tableName} SET collection = $1, product = $2, color = $3, price = $4, gender = $5, material = $6, type = $7 WHERE plu = $8 AND id_branch = $9`;
    values = [
      updatedItem.collection, // $1
      updatedItem.product, // $2
      updatedItem.color, // $3
      updatedItem.price, // $4
      updatedItem.gender, // $5
      updatedItem.material, // $6
      updatedItem.type, // $7
      updatedItem.plu, // $8
      id_branch, // $9
    ];
  }

  if (table === 1 && updatedItem.plu === "") {
    commandSQL = `INSERT INTO store_frames (id_organization, id_branch, collection, product, color, gender, material, type, plu, created_at, updated_at) SELECT $8, $7, $1, $2, $3, $4, $5, $6, COALESCE(MAX(plu), 0) + 1, NOW(), NOW() FROM store_frames WHERE id_branch = $7`;
    values = [
      updatedItem.collection, // $1
      updatedItem.product, // $2
      updatedItem.color, // $3
      updatedItem.gender, // $4
      updatedItem.material, // $5
      updatedItem.type, // $6
      id_branch, // $7
    ];
  }

  try {
    if (tableName === "") {
      throw new Error("Neplatná tabulka skladu.");
    }

    const result = await pool.query(commandSQL, values);

    console.log(`Počet aktualizovaných řádků: ${result.rowCount}`);

    if (result.rowCount === 0) {
      throw new Error(
        `Záznam s PLU ${updatedItem.plu}, id_branch ${id_branch} a id_organization ${id_organization} nebyl nalezen nebo nesplňuje podmínky pro aktualizaci.`,
      );
    }
    return result.rows;
  } catch (err) {
    console.error(`Chyba při update ITEMS v ${tableName}:`, err);
    throw err;
  }
}

export async function searchInStoreFromDB(
  table,
  query,
  id_branch,
  limit,
  offset,
  page,
) {
  const likePattern = query ? `%${query}%` : `%`;

  const tableName = table === "store_frames" ? "store_frames" : ``;

  if (tableName === "") {
    throw new Error("Neplatná tabulka skladu.");
  }

  try {
    // Hledání řetězce ve všech sloupcích pomocí CAST na text
    // Převedeme celý řádek na text a hledáme v něm
    const { rows: items } = await pool.query(
      `SELECT sf.*, c.nick AS supplier_nick FROM ${tableName} sf LEFT JOIN contacts c ON c.id = sf.id_supplier WHERE CAST(ROW(sf.*) AS TEXT) ILIKE $1 AND sf.id_branch = $2 ORDER BY sf.plu DESC LIMIT $3 OFFSET $4`,
      [likePattern, id_branch, limit, offset],
    );

    // Zjišťování celkového počtu záznamů
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM ${tableName} 
       WHERE CAST(ROW(${tableName}.*) AS TEXT) ILIKE $1 
       AND id_branch = $2`,
      [likePattern, id_branch],
    );

    const totalCount = rows[0]?.total ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      items, // každý item už obsahuje supplier_nick
      totalCount,
      totalPages,
      page,
    };
  } catch (err) {
    console.error("Chyba při načítání ITEMS z STORE:", err);
    throw err;
  }
}

export async function getContactsListFromDB(id_organization, query) {
  try {
    // Hledání řetězce ve všech sloupcích pomocí CAST na text
    // Převedeme celý řádek na text a hledáme v něm
    const { rows: items } = await pool.query(
      `SELECT id, nick FROM contacts WHERE field ILIKE $1 AND id_organizations = $2 ORDER BY nick ASC;`,
      [`%${query}%`, id_organization],
    );

    return { items };
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
      [id_client, id_branch, id_member, attrib, content, note],
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
      [id_invoice, attrib, price_a, vat_a, price_b, vat_b, price_c, vat_c],
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
      [id_branch],
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
