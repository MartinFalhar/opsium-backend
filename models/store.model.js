import pool from "../db/index.js";

export async function putInStoreDB(
  table,
  branch_id,
  plu,
  supplier_id,
  delivery_note,
  quantity,
  price_buy,
  date,
) {
  const storeTableName =
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

  // Najdi store_item_id podle PLU a branch_id
  const findItemSQL = `SELECT store_item_id FROM ${storeTableName} WHERE plu = $1 AND branch_id = $2`;

  const documentSQL =
    "INSERT INTO store_documents (branch_id, supplier_id, type, delivery_note, received_at) VALUES ($1, $2, $3, $4, $5) RETURNING id";
  const documentValues = [
    branch_id, // $1
    supplier_id, // $2
    "receipt", // $3
    delivery_note, // $4
    date, // $5
  ];

  const batchSQL = `INSERT INTO store_batches (store_document_id, purchase_price, quantity_received, store_item_id) VALUES ($1, $2, $3, $4)`;

  try {
    await pool.query("BEGIN");

    // Najdi store_item_id podle PLU
    const itemResult = await pool.query(findItemSQL, [plu, branch_id]);

    if (itemResult.rows.length === 0) {
      await pool.query("ROLLBACK");
      throw new Error(`Položka s PLU ${plu} nebyla nalezena`);
    }

    const store_item_id = itemResult.rows[0].store_item_id;

    // Vkládání záznamu do store_documents (dodací list)
    const docResult = await pool.query(documentSQL, documentValues);
    const store_document_id = docResult.rows[0].id;

    // Vkládání záznamu do store_batches (šarže naskladnění)
    const batchValues = [
      id_document, // $1 - store_document_id
      price_buy, // $2 - purchase_price
      quantity, // $3 - quantity_received
      store_item_id, // $4 - store_item_id
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
  branch_id,
  organization_id,
) {
  const tableName = table === 1 ? "store_frames" : "";
  let commandSQL = "";
  let values = [];
  await pool.query("BEGIN");

  if (table === 1 && updatedItem.plu !== "") {
    commandSQL = `UPDATE ${tableName} SET collection = $1, product = $2, color = $3, price = $4, gender = $5, material = $6, type = $7 WHERE plu = $8 AND branch_id = $9`;
    values = [
      updatedItem.collection, // $1
      updatedItem.product, // $2
      updatedItem.color, // $3
      updatedItem.price, // $4
      updatedItem.gender, // $5
      updatedItem.material, // $6
      updatedItem.type, // $7
      updatedItem.plu, // $8
      branch_id, // $9
    ];
  }

  if (table === 1 && updatedItem.plu === "") {
    try {
      // 1. Vytvoř záznam v store_items pouze s store_id
      const itemResult = await pool.query(
        `INSERT INTO store_items (store_id)
         VALUES ($1)
         RETURNING id`,
        [1], // store_id (1 = frames)
      );
      const store_item_id = itemResult.rows[0].id;

      // 2. Získej nové PLU
      const newPluResult = await pool.query(
        `SELECT COALESCE(MAX(plu), 0) + 1 as new_plu FROM store_frames WHERE branch_id = $1`,
        [branch_id],
      );
      const newPlu = newPluResult.rows[0].new_plu;

      // 3. Vytvoř záznam v store_frames s store_item_id a PLU (updated_at je ošetřeno triggerem)
      const frameResult = await pool.query(
        `INSERT INTO store_frames (store_item_id, organization_id, branch_id, collection, product, color, size, gender, material, type, plu)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          store_item_id,
          organization_id,
          branch_id,
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
        `Záznam s PLU ${updatedItem.plu}, branch_id ${branch_id} a organization_id ${organization_id} nebyl nalezen nebo nesplňuje podmínky pro aktualizaci.`,
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
  branch_id,
  limit,
  offset,
  page,
) {
  const likePattern = query ? `%${query}%` : `%`;

  const storeTableName =
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

  if (storeTableName === "") {
    throw new Error("Neplatná tabulka skladu.");
  }

  //Search SQL pro tabulku skladů
  let SearchSQL = "";
  //sklady frames, sunglasses a goods
  if (store == 1 || store == 2 || store == 6) {
    SearchSQL = `SELECT sf.*, c.nick AS supplier_nick, sis.quantity_available, sis.quantity_reserved 
                 FROM ${storeTableName} sf 
                 LEFT JOIN contacts c ON c.id = sf.supplier_id 
                 LEFT JOIN store_item_stock sis ON sis.store_item_id = sf.store_item_id 
                 WHERE CAST(ROW(sf.*) AS TEXT) ILIKE $1 AND sf.branch_id = $2
                 ORDER BY sf.plu DESC LIMIT $3 OFFSET $4`;
  } else {
    // sklad lens
    if (store == 3) {
      SearchSQL = `SELECT sf.*, c.nick AS supplier_nick, sis.quantity_available, sis.quantity_reserved, cl.name AS catalog_lens_name 
                 FROM ${storeTableName} sf 
                 LEFT JOIN contacts c ON c.id = sf.supplier_id 
                 LEFT JOIN store_item_stock sis ON sis.store_item_id = sf.store_item_id 
                 INNER JOIN catalog_lens cl ON cl.id = sf.catalog_lens_id
                 WHERE CAST(ROW(sf.*) AS TEXT) ILIKE $1 AND sf.branch_id = $2
                 ORDER BY sf.plu DESC LIMIT $3 OFFSET $4`;
    } else {
      // sklad contact lenses
      if (store == 4) {
        SearchSQL = `SELECT sf.*, c.nick AS supplier_nick, sis.quantity_available, sis.quantity_reserved, cl.name AS catalog_cl_name 
                 FROM ${storeTableName} sf 
                 LEFT JOIN contacts c ON c.id = sf.supplier_id 
                 LEFT JOIN store_item_stock sis ON sis.store_item_id = sf.store_item_id 
                 INNER JOIN catalog_lens cl ON cl.id = sf.catalog_cl_id
                 WHERE CAST(ROW(sf.*) AS TEXT) ILIKE $1 AND sf.branch_id = $2
                 ORDER BY sf.plu DESC LIMIT $3 OFFSET $4`;
      }
    }
  }

  try {
    const { rows: items } = await pool.query(SearchSQL, [
      likePattern,
      branch_id,
      limit,
      offset,
    ]);

    // Zjišťování celkového počtu záznamů
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM ${storeTableName} sf
       WHERE CAST(ROW(sf.*) AS TEXT) ILIKE $1 
       AND sf.branch_id = $2`,
      [likePattern, branch_id],
    );

    const totalCount = rows[0]?.total ?? 0;
    const totalPages = Math.ceil(totalCount / limit);
    console.log(items);
    return {
      items, // každý item už obsahuje supplier_nick
      totalCount,
      totalPages,
      page,
    };
  } catch (err) {
    console.error("Chyba při hledání v skladu:", err);
    console.error("SQL:", SearchSQL);
    console.error("Params:", { likePattern, branch_id, limit, offset });
    throw err;
  }
}

export async function getContactsListFromDB(organization_id, query) {
  try {
    // Pokud je query prázdný, vrátíme všechny kontakty pro danou organizaci
    // Jinak filtrujeme podle pole field
    let items;
    if (!query || query.trim() === "") {
      const result = await pool.query(
        `SELECT id, nick FROM contacts WHERE organization_id = $1 ORDER BY nick ASC;`,
        [organization_id],
      );
      items = result.rows;
    } else {
      const result = await pool.query(
        `SELECT id, nick FROM contacts WHERE field ILIKE $1 AND organization_id = $2 ORDER BY nick ASC;`,
        [`%${query}%`, organization_id],
      );
      items = result.rows;
    }

    return { items };
  } catch (err) {
    console.error("Chyba při načítání ITEMS z STORE:", err);
    throw err;
  }
}

export async function newOrderInsertToDB(order) {
  try {
    const {
      client_id = `${order.client_id}`,
      branch_id = `${order.branch_id}`,
      member_id = `${order.member_id}`,
      attrib = `${order.attrib}`,
      content = `${order.content}`,
      note = `${order.note}`,
    } = order || {};
    await pool.query("BEGIN");

    const userResult = await pool.query(
      "INSERT INTO invoices (client_id, branch_id, member_id, attrib, content, note) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [client_id, branch_id, member_id, attrib, content, note],
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
      invoice_id = `${transaction.invoiceID}`,
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
      "INSERT INTO transactions (invoice_id, attrib, price_a, vat_a, price_b, vat_b, price_c, vat_c) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
      [invoice_id, attrib, price_a, vat_a, price_b, vat_b, price_c, vat_c],
    );
    const newTransactionID = userResult.rows[0].id;
    await pool.query("COMMIT");
    return invoice_id;
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

export async function ordersListFromDB(branch_id) {
  try {
    const result = await pool.query(
      "SELECT * FROM orders WHERE branch_id = $1",
      [branch_id],
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
  branch_id,
  organization_id,
  items,
  store_id,
) {
  console.log("Model - putInMultipleStoreDB called with:", {
    branch_id,
    organization_id,
    items,
    store_id,
  });

  const storeTableName =
    store_id === 1
      ? "store_frames"
      : store_id === 2
        ? "store_sunglasses"
        : store_id === 3
          ? "store_lens"
          : store_id === 4
            ? "store_cl"
            : store_id === 5
              ? "store_soldrops"
              : store_id === 6
                ? "store_goods"
                : "";

  // Extrahujeme společné hodnoty z items
  const supplier_id = items.supplier_id;
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
        //STORE - ALL
        plu: items[`plu${suffix}`] || "",
        price: items[`price${suffix}`] || 0,
        price_buy: items[`price_buy${suffix}`] || 0,
        quantity: items[`quantity${suffix}`] || 1,

        //STORE 1 a 2 - FRAMES a SUNGLASSES

        collection: items[`collection${suffix}`] || "",
        product: items[`product${suffix}`] || "",
        color: items[`color${suffix}`] || "",
        size: items[`size${suffix}`] || "",
        gender: items[`gender${suffix}`] || "",
        material: items[`material${suffix}`] || "",
        type: items[`type${suffix}`] || "",

        //STORE 3,4 - LENS, CONTACT LENS
        catalog_lens_id: items[`id${suffix}`] || "",
        catalog_cl_id: items[`id${suffix}`] || "",
        name: items[`name${suffix}`] || "",
        sph: items[`sph${suffix}`] || 0,
        cyl: items[`cyl${suffix}`] || 0,
        ax: items[`ax${suffix}`] || 0,
        code: items[`code${suffix}`] || "",

        //STORE 6 - GOODS
        model: items[`model${suffix}`] || "",
        vat_rate: items[`vat_rate${suffix}`] || 0,
        param: items[`param${suffix}`] || "",
        uom: items[`uom${suffix}`] || "",
        tags: items[`tags${suffix}`] || "",
      });
    }
  }

  console.log(
    "storeDocuments - itemsArray prepared:",
    branch_id,
    supplier_id,
    delivery_note,
    date,
  );

  const documentSQL =
    "INSERT INTO store_documents (branch_id, supplier_id, type, delivery_note, received_at) VALUES ($1, $2, $3, $4, $5) RETURNING id";

  //For example store_id (1 = frames)
  const getItemIdSQL = `SELECT store_item_id FROM ${storeTableName} WHERE plu = $1`;

  const createNewItemSQL = `INSERT INTO store_items (store_id) VALUES ($1) RETURNING id`;

  const pluSQL = `SELECT COALESCE(MAX(plu), 0) + 1 as new_plu FROM ${storeTableName} WHERE branch_id = $1`;

  // Insert SQL pro frames
  const insertFrameSQL = `
    INSERT INTO ${storeTableName} (store_item_id, organization_id, branch_id, collection, product, color, size, gender, material, type, supplier_id, plu, price)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;

  const insertLensSQL = `
    INSERT INTO ${storeTableName} (catalog_lens_id, branch_id, organization_id, plu, sph, cyl, ax, price, code, store_item_id, supplier_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;

  const insertCLSQL = `
    INSERT INTO ${storeTableName} (catalog_cl_id, branch_id, organization_id, plu, sph, cyl, ax, price, store_item_id, supplier_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;

  const insertGoodsSQL = `
    INSERT INTO ${storeTableName} (store_item_id, branch_id, organization_id, plu, model, size, color, uom, tags, vat_type_id, price, supplier_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;

  const batchSQL = `
    INSERT INTO store_batches (store_document_id, purchase_price, quantity_received, store_item_id)
    VALUES ($1, $2, $3, $4)
  `;

  try {
    // 1. Vytvoř dokument (dodací list)
    const documentValues = [
      branch_id,
      supplier_id,
      "receipt",
      delivery_note,
      date,
    ];
    const docResult = await pool.query(documentSQL, documentValues);

    const store_document_id = docResult.rows[0].id;

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
      let store_item_id;
      console.log("Tohle je PLU:" + item.plu);
      // Zjisti nebo vytvoř store_item
      if (item.plu !== "") {
        // Pokud má PLU, zkus najít existující
        const itemResult = await pool.query(getItemIdSQL, [item.plu]);
        if (itemResult.rows.length > 0) {
          store_item_id = itemResult.rows[0].store_item_id;
        }
      }

      if (!store_item_id) {
        // Pokud PLU není nebo položka neexistuje, vytvoř novou položku v store_items a získej její store_item_id
        const newIdStoreItem = await pool.query(createNewItemSQL, [store_id]);
        console.log(
          "Nová položka vytvořena v store_items s ID:",
          newIdStoreItem.rows[0].id,
        );
        store_item_id = newIdStoreItem.rows[0].id;
      }

      const getNewPluResult = await pool.query(pluSQL, [branch_id]);
      const newPlu = getNewPluResult.rows[0].new_plu;

      // 3. Vlož nebo aktualizuj store_frames
      const insertSQL =
        store_id === 1
          ? insertFrameSQL
          : store_id === 3
            ? insertLensSQL
            : store_id === 4
              ? insertCLSQL
              : store_id === 6
                ? insertGoodsSQL
                : null;
      const insertValues =
        store_id === 1
          ? [
              store_item_id,
              organization_id,
              branch_id,
              item.collection,
              item.product,
              item.color,
              item.size,
              item.gender,
              item.material,
              item.type,
              supplier_id,
              newPlu,
              item.price,
            ]
          : store_id === 3
            ? [
                item.catalog_lens_id,
                branch_id,
                organization_id,
                newPlu,
                item.sph,
                item.cyl,
                item.ax,
                item.price,
                item.code,
                store_item_id,
                supplier_id,
              ]
            : store_id === 4
              ? [
                  item.catalog_cl_id,
                  branch_id,
                  organization_id,
                  newPlu,
                  item.sph,
                  item.cyl,
                  item.ax,
                  item.price,
                  store_item_id,
                  supplier_id,
                ]
              : store_id === 6
                ? [
                    store_item_id,
                    branch_id,
                    organization_id,
                    newPlu,
                    item.model,
                    item.size,
                    item.color,
                    item.uom,
                    item.tags,
                    item.vat_rate,
                    item.price,
                    supplier_id,
                  ]
                : [];

      const result = await pool.query(insertSQL, insertValues);

      pluArray.push(newPlu);
      console.log("Inserted/Updated frame with PLU:", newPlu);

      // 4. Vytvoř batch záznam
      await pool.query(batchSQL, [
        store_document_id,
        item.price_buy,
        item.quantity,
        store_item_id,
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

export async function getCatalogInfoFromDB(plu, catalogType) {
  try {
    // Mapování typu skladu na název tabulky
    const catalogTables = {
      StoreLens: "catalog_lens",
      StoreCL: "catalog_cl",
      StoreSoldrops: "catalog_soldrops",
    };

    const tableName = catalogTables[catalogType] || "catalog_lens";
    const result = await pool.query(
      `SELECT cc.*, c.nick AS supplier_nick
   FROM catalog_cl cc
   LEFT JOIN contacts c ON c.id = cc.supplier_id
   WHERE cc.plu = $1`,
      [plu],
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    } else {
      console.log(`Model - No item found with PLU: ${plu} in ${tableName}`);
      return null;
    }
  } catch (err) {
    console.error("Chyba při načítání informací z katalogu:", err);
    throw err;
  }
}

export async function getVatListFromDB() {
  try {
    const { rows: items } = await pool.query(
      `SELECT id, rate FROM vat_rates ORDER BY rate ASC;`,
    );

    return { items };
  } catch (err) {
    console.error("Chyba při načítání sazeb DPH:", err);
    throw err;
  }
}
