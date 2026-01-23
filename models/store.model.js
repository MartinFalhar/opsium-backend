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
  const findItemSQL =
    "SELECT id_store_item FROM store_frames WHERE plu = $1 AND id_branch = $2";

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
    try {
      await pool.query("BEGIN");

      // 1. Vytvoř záznam v store_items pouze s id_warehouse
      const itemResult = await pool.query(
        `INSERT INTO store_items (id_warehouse)
         VALUES ($1)
         RETURNING id_store_item`,
        [1], // id_warehouse (1 = frames)
      );
      const id_store_item = itemResult.rows[0].id_store_item;

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

  const warehouseTabelName =
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

  // Vytvoříme pole položek
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
        quantity: items[`quantity${suffix}`] || 1,
        size: items[`size${suffix}`] || "",
        gender: items[`gender${suffix}`] || "",
        material: items[`material${suffix}`] || "",
        type: items[`type${suffix}`] || "",
      });
    }
  }

  console.log("Parsed items array:", itemsArray);

  const documentSQL =
    "INSERT INTO store_documents (id_branch, id_supplier, type, delivery_note, received_at) VALUES ($1, $2, $3, $4, $5) RETURNING id";

  //For example id_warehouse (1 = frames)
  const getItemIdSQL = `
    INSERT INTO store_items (id_warehouse)
         VALUES ($1)
         RETURNING id`;

  const insertFrameSQL = `
    INSERT INTO ${warehouseTabelName} (id_store_item, id_organization, id_branch, collection, product, color, size, gender, material, type, id_supplier)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;

  const batchSQL = `
    INSERT INTO store_batches (store_documents_id, purchase_price, quantity_received, id_store_item)
    VALUES ($1, $2, $3, $4)
  `;

  try {
    await pool.query("BEGIN");

    // 1. Vytvoř dokument (dodací list)
    const documentValues = [
      id_branch,
      id_supplier,
      (type = "receipt"),
      delivery_note,
      (received_at = date),
    ];
    const docResult = await pool.query(documentSQL, documentValues);
    const id_document = docResult.rows[0].id;

    console.log("Created document with id:", id_document);

    let processedCount = 0;

    // 2. Pro každou položku
    for (const item of itemsArray) {
      let id_store_item;

      // Zjisti nebo vytvoř store_item
      if (item.plu && item.plu !== "") {
        // Pokud má PLU, zkus najít existující
        const itemResult = await pool.query(getItemIdSQL, [
          item.plu,
          id_warehouse,
        ]);
        if (itemResult.rows.length > 0) {
          id_store_item = itemResult.rows[0].id_store_item;
        }
      }

      if (!id_store_item) {
        // Vytvoř nový store_item
        const createItemValues = [
          id_warehouse,
          item.plu || null,
          item.collection,
          item.product,
          item.color,
          item.size,
          item.gender,
          item.material,
          item.type,
          id_organization,
          id_branch,
        ];
        const newItemResult = await pool.query(
          findOrCreateItemSQL,
          createItemValues,
        );

        if (newItemResult.rows.length > 0) {
          id_store_item = newItemResult.rows[0].id_store_item;
        } else {
          // Pokud INSERT nevrátil nic (už existuje), načti id
          const existingResult = await pool.query(getItemIdSQL, [
            item.plu,
            id_warehouse,
          ]);
          id_store_item = existingResult.rows[0].id_store_item;
        }
      }

      console.log("Processing item with id_store_item:", id_store_item);

      // 3. Vlož nebo aktualizuj store_frames
      await pool.query(insertFrameSQL, [
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
        item.plu,
        id_supplier,
      ]);

      // 4. Vytvoř batch záznam
      await pool.query(batchSQL, [
        id_document,
        item.price_buy,
        item.quantity,
        id_store_item,
      ]);

      processedCount++;
    }
    //Zde je konec FOR cyklu

    await pool.query("COMMIT");
    console.log(`Successfully processed ${processedCount} items`);

    return {
      success: true,
      message: `Bylo naskladněno ${processedCount} položek`,
      count: processedCount,
    };
  } catch (err) {
    console.error("Chyba při hromadném naskladňování:", err);
    await pool.query("ROLLBACK");
    throw err;
  }
}
