import pool from "../db/index.js";

export async function putInStoreDB(
  table,
  id_branch,
  plu,
  id_supplier,
  delivery_note,
  quantity,
  price_buy,
  date,
) {
  const warehouseTableName =
    table === 1
      ? "store_frames"
      : table === 2
        ? "store_sunglasses"
        : table === 3
          ? "store_lens"
          : table === 4
            ? "store_cl"
            : table === 5
              ? "store_soldrops"
              : table === 6
                ? "store_goods"
                : "";

  // Najdi id_store_item podle PLU a id_branch
  const findItemSQL = `SELECT id_store_item FROM ${warehouseTableName} WHERE plu = $1 AND id_branch = $2`;

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

    // Vkládání záznamu do store_documents (dodací list)
    const docResult = await pool.query(documentSQL, documentValues);
    const id_document = docResult.rows[0].id;

    // Vkládání záznamu do store_batches (šarže naskladnění)
    const batchValues = [
      id_document, // $1 - store_documents_id
      price_buy, // $2 - purchase_price
      quantity, // $3 - quantity_received
      id_store_item, // $4 - id_store_item
    ];

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
  await pool.query("BEGIN");

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
    try {
      // 1. Vytvoř záznam v store_items pouze s id_warehouse
      const itemResult = await pool.query(
        `INSERT INTO store_items (id_warehouse)
         VALUES ($1)
         RETURNING id`,
        [1], // id_warehouse (1 = frames)
      );
      const id_store_item = itemResult.rows[0].id;

      // 2. Získej nové PLU
      const newPluResult = await pool.query(
        `SELECT COALESCE(MAX(plu), 0) + 1 as new_plu FROM store_frames WHERE id_branch = $1`,
        [id_branch],
      );
      const newPlu = newPluResult.rows[0].new_plu;

      // 3. Vytvoř záznam v store_frames s id_store_item a PLU (updated_at je ošetřeno triggerem)
      const frameResult = await pool.query(
        `INSERT INTO store_frames (id_store_item, id_organization, id_branch, collection, product, color, size, gender, material, type, plu)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          id_store_item,
          id_organization,
          id_branch,
          updatedItem.collection,
          updatedItem.product,
          updatedItem.color,
          updatedItem.size || "",
          updatedItem.gender,
          updatedItem.material,
          updatedItem.type,
          newPlu,
        ],
      );

      await pool.query("COMMIT");
      return frameResult.rows;
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error(`Chyba při vytváření nové položky v ${tableName}:`, err);
      throw err;
    }
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
  store,
  query,
  id_branch,
  limit,
  offset,
  page,
) {
  const likePattern = query ? `%${query}%` : `%`;
  console.log("XXXXX Hledaný sklad:", store, "TYP:", typeof store);
  const warehouseTableName =
    store == 1
      ? "store_frames"
      : store == 2
        ? "store_sunglasses"
        : store == 3
          ? "store_lens"
          : store == 4
            ? "store_cl"
            : store == 5
              ? "store_soldrops"
              : store == 6
                ? "store_goods"
                : "";

  if (warehouseTableName === "") {
    throw new Error("Neplatná tabulka skladu.");
  }

  try {
    const { rows: items } = await pool.query(
      `SELECT sf.*, c.nick AS supplier_nick, sis.quantity_available, sis.quantity_reserved 
       FROM ${warehouseTableName} sf 
       LEFT JOIN contacts c ON c.id = sf.id_supplier 
       LEFT JOIN store_item_stock sis ON sis.id_store_item = sf.id_store_item 
       WHERE CAST(ROW(sf.*) AS TEXT) ILIKE $1 AND sf.id_branch = $2 
       ORDER BY sf.plu DESC 
       LIMIT $3 OFFSET $4`,
      [likePattern, id_branch, limit, offset],
    );

    // Zjišťování celkového počtu záznamů
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM ${warehouseTableName} sf
       WHERE CAST(ROW(sf.*) AS TEXT) ILIKE $1 
       AND sf.id_branch = $2`,
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

export async function putInMultipleStoreDB(
  id_branch,
  id_organization,
  items,
  id_warehouse,
) {
  console.log("Model - putInMultipleStoreDB called with:", {
    id_branch,
    id_organization,
    items,
    id_warehouse,
  });

  const warehouseTableName =
    id_warehouse === 1
      ? "store_frames"
      : id_warehouse === 2
        ? "store_sunglasses"
        : id_warehouse === 3
          ? "store_lens"
          : id_warehouse === 4
            ? "store_cl"
            : id_warehouse === 5
              ? "store_soldrops"
              : id_warehouse === 6
                ? "store_goods"
                : "";

  // Extrahujeme společné hodnoty z items
  const id_supplier = items.id_supplier;
  const delivery_note = items.delivery_note;
  const date = items.date;

  // Výytupní pole s PLU
  const pluArray = [];

  // OPTIMALIZACE - počet průchodů
  // Pole pro položky - filtrujeme pouze položky s _1, _2, atd.
  const itemsArray = [];
  const keys = Object.keys(items);
  // Najdeme maximální index
  let maxIndex = 0;
  keys.forEach((key) => {
    const match = key.match(/_(\d+)$/);
    if (match) {
      maxIndex = Math.max(maxIndex, parseInt(match[1]));
    }
  });
  // OPTIMALIZACE - zapiš jen ty s hodnotami
  // Validace položek a vytvoření pole položek
  // Na zápis se posílají pouze položky, které mají alespoň jednu vyplněnou hodnotu
  for (let i = 0; i <= maxIndex; i++) {
    const suffix = i === 0 ? "" : `_${i}`;

    // Zkontrolujeme, jestli existuje alespoň jedna hodnota pro tento index
    const hasData = keys.some((key) => key.endsWith(suffix) && items[key]);

    if (hasData) {
      itemsArray.push({
        plu: items[`plu${suffix}`] || "",
        collection: items[`collection${suffix}`] || "",
        product: items[`product${suffix}`] || "",
        color: items[`color${suffix}`] || "",
        price_buy: items[`price_buy${suffix}`] || 0,
        price: items[`price_sold${suffix}`] || 0,
        quantity: items[`quantity${suffix}`] || 1,
        size: items[`size${suffix}`] || "",
        gender: items[`gender${suffix}`] || "",
        material: items[`material${suffix}`] || "",
        type: items[`type${suffix}`] || "",
      });
    }
  }

  const documentSQL =
    "INSERT INTO store_documents (id_branch, id_supplier, type, delivery_note, received_at) VALUES ($1, $2, $3, $4, $5) RETURNING id";

  //For example id_warehouse (1 = frames)
  const getItemIdSQL = `SELECT id_store_item FROM ${warehouseTableName} WHERE plu = $1`;

  const createNewItemSQL = `INSERT INTO store_items (id_warehouse) VALUES ($1) RETURNING id`;

  const pluSQL = `SELECT COALESCE(MAX(plu), 0) + 1 as new_plu FROM ${warehouseTableName} WHERE id_branch = $1`;

  const insertFrameSQL = `
    INSERT INTO ${warehouseTableName} (id_store_item, id_organization, id_branch, collection, product, color, size, gender, material, type, id_supplier, plu, price)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;

  const batchSQL = `
    INSERT INTO store_batches (store_documents_id, purchase_price, quantity_received, id_store_item)
    VALUES ($1, $2, $3, $4)
  `;

  try {
    // 1. Vytvoř dokument (dodací list)
    const documentValues = [
      id_branch,
      id_supplier,
      "receipt",
      delivery_note,
      date,
    ];
    const docResult = await pool.query(documentSQL, documentValues);

    const store_documents_id = docResult.rows[0].id;

    //BEGIN BEGIN BEGIN BEGIN
    await pool.query("BEGIN");
    //BEGIN BEGIN BEGIN BEGIN

    let processedCount = 0;
    //********************************************** */
    //********************************************** */
    //ZAČÁTEK CYKLU */
    //********************************************** */
    // console.log("Processing", itemsArray, "items for naskladnění.");
    // 2. Pro každou položku
    for (const item of itemsArray) {
      let id_store_item;
      console.log("Tohle je PLU:" + item.plu);
      // Zjisti nebo vytvoř store_item
      if (item.plu !== "") {
        // Pokud má PLU, zkus najít existující
        const itemResult = await pool.query(getItemIdSQL, [item.plu]);
        if (itemResult.rows.length > 0) {
          id_store_item = itemResult.rows[0].id_store_item;
        }
      }

      if (!id_store_item) {
        // Pokud PLU není nebo položka neexistuje, vytvoř novou položku v store_items a získej její id_store_item
        const newIdStoreItem = await pool.query(createNewItemSQL, [
          id_warehouse,
        ]);
        console.log(
          "Nová položka vytvořena v store_items s ID:",
          newIdStoreItem.rows[0].id,
        );
        id_store_item = newIdStoreItem.rows[0].id;
      }

      const getNewPluResult = await pool.query(pluSQL, [id_branch]);
      const newPlu = getNewPluResult.rows[0].new_plu;

      // 3. Vlož nebo aktualizuj store_frames
      const result = await pool.query(insertFrameSQL, [
        id_store_item,
        id_organization,
        id_branch,
        item.collection,
        item.product,
        item.color,
        item.size,
        item.gender,
        item.material,
        item.type,
        id_supplier,
        newPlu,
        item.price,
      ]);

      pluArray.push(newPlu);
      console.log("Inserted/Updated frame with PLU:", newPlu);

      // 4. Vytvoř batch záznam
      await pool.query(batchSQL, [
        store_documents_id,
        item.price_buy,
        item.quantity,
        id_store_item,
      ]);
    }
    //Zde je konec FOR cyklu
    //********************************************** */
    //********************************************** */

    processedCount++;

    await pool.query("COMMIT");
    console.log(`Successfully processed ${processedCount} items`);

    return {
      success: true,
      message: `Bylo naskladněno ${processedCount} položek`,
      count: processedCount,
      pluArray: pluArray,
    };
  } catch (err) {
    console.error("Chyba při hromadném naskladňování:", err);
    await pool.query("ROLLBACK");
    throw err;
  }
}
