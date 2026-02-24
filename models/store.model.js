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
    SearchSQL = `SELECT sf.*, c.nick AS supplier_nick, COALESCE(sb.quantity_available, 0) AS quantity_available, COALESCE(sr.quantity_reserved, 0) AS quantity_reserved
                 FROM ${storeTableName} sf 
                 LEFT JOIN contacts c ON c.id = sf.supplier_id 
                 LEFT JOIN (
                   SELECT store_item_id, SUM(quantity_received - quantity_sold)::int AS quantity_available
                   FROM store_batches
                   GROUP BY store_item_id
                 ) sb ON sb.store_item_id = sf.store_item_id
                 LEFT JOIN (
                   SELECT sb.store_item_id, SUM(sr.quantity)::int AS quantity_reserved
                   FROM store_reservations sr
                   INNER JOIN store_batches sb ON sb.id = sr.store_batch_id
                   GROUP BY sb.store_item_id
                 ) sr ON sr.store_item_id = sf.store_item_id
                 WHERE CAST(ROW(sf.*) AS TEXT) ILIKE $1 AND sf.branch_id = $2
                 ORDER BY sf.plu DESC LIMIT $3 OFFSET $4`;
  } else {
    // sklad lens
    if (store == 3) {
      SearchSQL = `SELECT sf.*, c.nick AS supplier_nick, COALESCE(sb.quantity_available, 0) AS quantity_available, COALESCE(sr.quantity_reserved, 0) AS quantity_reserved, cl.name AS catalog_lens_name 
                 FROM ${storeTableName} sf 
                 LEFT JOIN contacts c ON c.id = sf.supplier_id 
                 LEFT JOIN (
                   SELECT store_item_id, SUM(quantity_received - quantity_sold)::int AS quantity_available
                   FROM store_batches
                   GROUP BY store_item_id
                 ) sb ON sb.store_item_id = sf.store_item_id
                 LEFT JOIN (
                   SELECT sb.store_item_id, SUM(sr.quantity)::int AS quantity_reserved
                   FROM store_reservations sr
                   INNER JOIN store_batches sb ON sb.id = sr.store_batch_id
                   GROUP BY sb.store_item_id
                 ) sr ON sr.store_item_id = sf.store_item_id
                 INNER JOIN catalog_lens cl ON cl.id = sf.catalog_lens_id
                 WHERE CAST(ROW(sf.*) AS TEXT) ILIKE $1 AND sf.branch_id = $2
                 ORDER BY sf.plu DESC LIMIT $3 OFFSET $4`;
    } else {
      // sklad contact lenses
      if (store == 4) {
        SearchSQL = `SELECT sf.*, c.nick AS supplier_nick, COALESCE(sb.quantity_available, 0) AS quantity_available, COALESCE(sr.quantity_reserved, 0) AS quantity_reserved, cl.name AS catalog_cl_name 
                 FROM ${storeTableName} sf 
                 LEFT JOIN contacts c ON c.id = sf.supplier_id 
                 LEFT JOIN (
                   SELECT store_item_id, SUM(quantity_received - quantity_sold)::int AS quantity_available
                   FROM store_batches
                   GROUP BY store_item_id
                 ) sb ON sb.store_item_id = sf.store_item_id
                 LEFT JOIN (
                   SELECT sb.store_item_id, SUM(sr.quantity)::int AS quantity_reserved
                   FROM store_reservations sr
                   INNER JOIN store_batches sb ON sb.id = sr.store_batch_id
                   GROUP BY sb.store_item_id
                 ) sr ON sr.store_item_id = sf.store_item_id
                 INNER JOIN catalog_cl cl ON cl.id = sf.catalog_cl_id
                 WHERE CAST(ROW(sf.*) AS TEXT) ILIKE $1 AND sf.branch_id = $2
                 ORDER BY sf.plu ASC LIMIT $3 OFFSET $4`;
      } else {
        // sklad solddrops
        SearchSQL = `SELECT sf.*, c.nick AS supplier_nick, COALESCE(sb.quantity_available, 0) AS quantity_available, COALESCE(sr.quantity_reserved, 0) AS quantity_reserved, cl.name AS catalog_soldrops_name
                  FROM ${storeTableName} sf
                  LEFT JOIN contacts c ON c.id = sf.supplier_id
                  LEFT JOIN (
                    SELECT store_item_id, SUM(quantity_received - quantity_sold)::int AS quantity_available
                    FROM store_batches
                    GROUP BY store_item_id
                  ) sb ON sb.store_item_id = sf.store_item_id
                  LEFT JOIN (
                    SELECT sb.store_item_id, SUM(sr.quantity)::int AS quantity_reserved
                    FROM store_reservations sr
                    INNER JOIN store_batches sb ON sb.id = sr.store_batch_id
                    GROUP BY sb.store_item_id
                  ) sr ON sr.store_item_id = sf.store_item_id
                  INNER JOIN catalog_soldrops cl ON cl.id = sf.catalog_soldrops_id
                  WHERE CAST(ROW(sf.*) AS TEXT) ILIKE $1 AND sf.branch_id = $2
                  ORDER BY sf.plu ASC LIMIT $3 OFFSET $4`;
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
    // console.log(items);
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
    const { client_id, branch_id, member_id, status = "draft" } = order || {};

    console.log("Model - newOrderInsertToDB called with:", {
      client_id,
      branch_id,
      member_id,
      status,
    });

    if (!client_id || !branch_id || !member_id) {
      throw new Error("Chybí client_id, branch_id nebo member_id.");
    }

    await pool.query("BEGIN");

    const orderResult = await pool.query(
      `INSERT INTO orders (client_id, branch_id, member_id, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, year, number, branch_id`,
      [client_id, branch_id, member_id, status],
    );

    await pool.query("COMMIT");
    return orderResult.rows[0];
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

export async function newTransactionInsertToDB(transaction) {
  console.log(transaction);
  try {
    const {
      order_id = transaction.order_id ?? transaction.orderID,
      attrib = `${transaction.attrib}`,
      price_a = `${transaction.price_a}`,
      vat_a = `${transaction.vat_a}`,
      price_b = `${transaction.price_b}`,
      vat_b = `${transaction.vat_b}`,
      price_c = `${transaction.price_c}`,
      vat_c = `${transaction.vat_c}`,
    } = transaction || {};

    if (!order_id) {
      throw new Error("order_id je povinné");
    }

    await pool.query("BEGIN");

    const userResult = await pool.query(
      "INSERT INTO transactions (order_id, attrib, price_a, vat_a, price_b, vat_b, price_c, vat_c) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
      [order_id, attrib, price_a, vat_a, price_b, vat_b, price_c, vat_c],
    );
    const newTransactionID = userResult.rows[0].id;
    await pool.query("COMMIT");
    return order_id;
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

export async function transactionListFromDB(transaction) {
  try {
    const branch_id = Number(transaction?.branch_id);
    const query = String(transaction?.query ?? "").trim();
    const rawPaymentAttrib = transaction?.payment_attrib;
    const payment_attrib =
      rawPaymentAttrib === null ||
      rawPaymentAttrib === undefined ||
      rawPaymentAttrib === ""
        ? null
        : Number(rawPaymentAttrib);
    const normalizedPaymentAttrib = Number.isFinite(payment_attrib)
      ? payment_attrib
      : null;
    const allowedTimeRanges = new Set([
      "today",
      "yesterday",
      "3days",
      "week",
      "month",
    ]);
    const time_range = allowedTimeRanges.has(String(transaction?.time_range ?? ""))
      ? String(transaction.time_range)
      : null;
    const likePattern = `%${query}%`;

    if (!Number.isFinite(branch_id) || branch_id <= 0) {
      throw new Error("branch_id je povinné");
    }

    const sql = `
      SELECT
        t.id,
        t.order_id,
        t.attrib,
        COALESCE(t.price_a, 0) AS price_a,
        COALESCE(t.vat_a, 0) AS vat_a,
        COALESCE(t.price_b, 0) AS price_b,
        COALESCE(t.vat_b, 0) AS vat_b,
        COALESCE(t.price_c, 0) AS price_c,
        COALESCE(t.vat_c, 0) AS vat_c,
        COALESCE(t.price_a, 0) + COALESCE(t.price_b, 0) + COALESCE(t.price_c, 0) AS amount,
        CASE t.attrib
          WHEN 1 THEN 'hotovost'
          WHEN 2 THEN 'platební karta'
          WHEN 3 THEN 'převod na účet'
          WHEN 4 THEN 'šek'
          WHEN 5 THEN 'okamžitá QR platba'
          ELSE 'platba'
        END AS payment_method,
        CONCAT_WS(' ', c.degree_before, c.name, c.surname, c.degree_after) AS customer_name,
        t.created_at,
        o.year,
        o.number
      FROM transactions t
      INNER JOIN orders o ON o.id = t.order_id
      LEFT JOIN clients c ON c.id = o.client_id
      WHERE o.branch_id = $1
        AND (
          $2 = ''
          OR CAST(t.id AS TEXT) ILIKE $3
          OR CAST(t.order_id AS TEXT) ILIKE $3
          OR CONCAT_WS(' ', c.degree_before, c.name, c.surname, c.degree_after) ILIKE $3
        )
        AND ($4::int IS NULL OR t.attrib = $4)
        AND (
          $5::text IS NULL
          OR ($5 = 'today' AND t.created_at >= date_trunc('day', NOW()))
          OR (
            $5 = 'yesterday'
            AND t.created_at >= date_trunc('day', NOW()) - interval '1 day'
            AND t.created_at < date_trunc('day', NOW())
          )
          OR ($5 = '3days' AND t.created_at >= NOW() - interval '3 days')
          OR ($5 = 'week' AND t.created_at >= NOW() - interval '7 days')
          OR ($5 = 'month' AND t.created_at >= NOW() - interval '1 month')
        )
      ORDER BY t.created_at DESC, t.id DESC
    `;

    const result = await pool.query(sql, [
      branch_id,
      query,
      likePattern,
      normalizedPaymentAttrib,
      time_range,
    ]);
    return result.rows;
  } catch (err) {
    console.error("Chyba při načítání transakcí:", err);
    throw err;
  }
}

export async function ordersListFromDB(branch_id) {
  try {
    const result = await pool.query(
      "SELECT o.*,  c.name,  c.surname,  c.degree_before,  c.degree_after FROM orders o LEFT JOIN clients_branches cb ON cb.client_id = o.client_id AND cb.branch_id = o.branch_id LEFT JOIN clients c ON c.id = cb.client_id WHERE o.branch_id = $1",
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

export async function loadOrderItemsForModalFromDB(order_id, branch_id) {
  try {
    const sql = `
      SELECT
        oi.id,
        oi.order_id,
        oi.item_type,
        oi.store_item_id,
        oi.quantity,
        oi.unit_purchase_price,
        oi.unit_sale_price,
        oi.specification_id,
        oi."group",
        oi.store_batch_id,
        oi.movement_type,
        oi.item_status,
        ols.specs,
        odv.ps AS dioptric_ps,
        odv.pc AS dioptric_pc,
        odv.pa AS dioptric_pa,
        odv.padd AS dioptric_padd,
        odv.pp AS dioptric_pp,
        odv.pb AS dioptric_pb,
        odv.ls AS dioptric_ls,
        odv.lc AS dioptric_lc,
        odv.la AS dioptric_la,
        odv.ladd AS dioptric_ladd,
        odv.lp AS dioptric_lp,
        odv.lb AS dioptric_lb,
        oc.p_pd AS centration_p_pd,
        oc.p_v AS centration_p_v,
        oc.p_vd AS centration_p_vd,
        oc.p_panto AS centration_p_panto,
        oc.l_pd AS centration_l_pd,
        oc.l_v AS centration_l_v,
        oc.l_vd AS centration_l_vd,
        oc.l_panto AS centration_l_panto,

        sg.plu AS goods_plu,
        sg.model AS goods_model,
        sg.size AS goods_size,
        sg.color AS goods_color,
        sg.uom AS goods_uom,
        sg.price AS goods_price,
        vg.rate AS goods_rate,

        sf.plu AS frame_plu,
        sf.collection AS frame_collection,
        sf.product AS frame_product,
        sf.color AS frame_color,
        sf.size AS frame_size,
        sf.gender AS frame_gender,
        sf.material AS frame_material,
        sf.type AS frame_type,
        sf.price AS frame_price,
        cf.nick AS frame_supplier_nick,

        sl.plu AS lens_plu,
        sl.code AS lens_code,
        sl.sph AS lens_sph,
        sl.cyl AS lens_cyl,
        sl.ax AS lens_ax,
        sl.price AS lens_price,

        asv.plu AS service_plu,
        asv.name AS service_name,
        asv.amount AS service_amount,
        asv.uom AS service_uom,
        asv.price AS service_price,
        asv.category AS service_category,
        asv.note AS service_note,
        vsv.rate AS service_rate
      FROM orders_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      LEFT JOIN orders_lens_specs ols ON ols.id = oi.specification_id
      LEFT JOIN orders_dioptric_values odv ON odv.order_item_id = oi.id
      LEFT JOIN orders_centrations oc ON oc.order_item_id = oi.id
      LEFT JOIN store_goods sg ON sg.store_item_id = oi.store_item_id AND sg.branch_id = o.branch_id
      LEFT JOIN vat_rates vg ON vg.id = sg.vat_type_id
      LEFT JOIN store_frames sf ON sf.store_item_id = oi.store_item_id AND sf.branch_id = o.branch_id
      LEFT JOIN contacts cf ON cf.id = sf.supplier_id
      LEFT JOIN store_lens sl ON sl.store_item_id = oi.store_item_id AND sl.branch_id = o.branch_id
      LEFT JOIN agenda_services asv
        ON asv.branch_id = o.branch_id
       AND asv.plu::text = COALESCE(ols.specs->'entered_plu'->>'service', '')
      LEFT JOIN vat_rates vsv ON vsv.id = asv.vat_type
      WHERE oi.order_id = $1
        AND o.branch_id = $2
      ORDER BY oi."group" ASC, oi.id ASC
    `;

    const result = await pool.query(sql, [order_id, branch_id]);
    return result.rows;
  } catch (err) {
    console.error("Chyba při načítání položek zakázky:", err);
    throw err;
  }
}

export async function loadOrderTransactionsForModalFromDB(order_id, branch_id) {
  try {
    const sql = `
      SELECT
        t.id,
        t.order_id,
        t.attrib,
        COALESCE(t.price_a, 0) + COALESCE(t.price_b, 0) + COALESCE(t.price_c, 0) AS amount,
        CASE t.attrib
          WHEN 1 THEN 'hotovost'
          WHEN 2 THEN 'platební karta'
          WHEN 3 THEN 'převod na účet'
          WHEN 4 THEN 'šek'
          WHEN 5 THEN 'okamžitá QR platba'
          ELSE 'platba'
        END AS method,
        t.created_at
      FROM transactions t
      INNER JOIN orders o ON o.id = t.order_id
      WHERE t.order_id = $1
        AND o.branch_id = $2
      ORDER BY t.created_at ASC, t.id ASC
    `;

    const result = await pool.query(sql, [order_id, branch_id]);
    return result.rows;
  } catch (err) {
    console.error("Chyba při načítání plateb zakázky:", err);
    throw err;
  }
}

function normalizeNullableNumber(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") {
      return null;
    }

    const normalized = trimmed.replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNullableInteger(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }

    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") {
      return null;
    }

    const normalized = trimmed.replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }

  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function normalizeNullableText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
}

export async function saveOrderDioptricValuesToDB(
  order_id,
  branch_id,
  entries = [],
  orderMeta = {},
) {
  if (!order_id) {
    return { success: false, message: "order_id je povinné" };
  }

  try {
    await pool.query("BEGIN");

    const orderCheck = await pool.query(
      `SELECT id
       FROM orders
       WHERE id = $1
         AND branch_id = $2
       LIMIT 1`,
      [order_id, branch_id],
    );

    if (orderCheck.rows.length === 0) {
      await pool.query("ROLLBACK");
      return { success: false, message: "Zakázka nebyla nalezena" };
    }

    const note = normalizeNullableText(orderMeta?.note);
    const deliveryAddress = normalizeNullableText(orderMeta?.delivery_address);

    await pool.query(
      `UPDATE orders
       SET note = $1,
           delivery_address = $2,
           updated_at = NOW()
       WHERE id = $3
         AND branch_id = $4`,
      [note, deliveryAddress, order_id, branch_id],
    );

    let savedCount = 0;

    for (const entry of entries) {
      const orderItemId = Number(entry?.order_item_id);
      if (!Number.isFinite(orderItemId) || orderItemId <= 0) {
        continue;
      }

      const itemCheck = await pool.query(
        `SELECT oi.id
         FROM orders_items oi
         INNER JOIN orders o ON o.id = oi.order_id
         WHERE oi.id = $1
           AND oi.order_id = $2
           AND o.branch_id = $3
           AND oi.item_type = 'frame'
         LIMIT 1`,
        [orderItemId, order_id, branch_id],
      );

      if (itemCheck.rows.length === 0) {
        continue;
      }

      const mappedValues = {
        ps: normalizeNullableNumber(entry?.right?.sph),
        pc: normalizeNullableNumber(entry?.right?.cyl),
        pa: normalizeNullableNumber(entry?.right?.osa),
        padd: normalizeNullableNumber(entry?.right?.add),
        pp: normalizeNullableNumber(entry?.right?.prizma),
        pb: normalizeNullableNumber(entry?.right?.baze),
        ls: normalizeNullableNumber(entry?.left?.sph),
        lc: normalizeNullableNumber(entry?.left?.cyl),
        la: normalizeNullableNumber(entry?.left?.osa),
        ladd: normalizeNullableNumber(entry?.left?.add),
        lp: normalizeNullableNumber(entry?.left?.prizma),
        lb: normalizeNullableNumber(entry?.left?.baze),
      };

      const mappedCentrations = {
        p_pd: normalizeNullableInteger(entry?.right?.pd),
        p_v: normalizeNullableInteger(entry?.right?.vyska),
        p_vd: normalizeNullableInteger(entry?.right?.vertex),
        p_panto: normalizeNullableInteger(entry?.right?.panto),
        l_pd: normalizeNullableInteger(entry?.left?.pd),
        l_v: normalizeNullableInteger(entry?.left?.vyska),
        l_vd: normalizeNullableInteger(entry?.left?.vertex),
        l_panto: normalizeNullableInteger(entry?.left?.panto),
      };

      const updateResult = await pool.query(
        `UPDATE orders_dioptric_values
         SET ps = $2,
             pc = $3,
             pa = $4,
             padd = $5,
             pp = $6,
             pb = $7,
             ls = $8,
             lc = $9,
             la = $10,
             ladd = $11,
             lp = $12,
             lb = $13
         WHERE order_item_id = $1`,
        [
          orderItemId,
          mappedValues.ps,
          mappedValues.pc,
          mappedValues.pa,
          mappedValues.padd,
          mappedValues.pp,
          mappedValues.pb,
          mappedValues.ls,
          mappedValues.lc,
          mappedValues.la,
          mappedValues.ladd,
          mappedValues.lp,
          mappedValues.lb,
        ],
      );

      if (updateResult.rowCount === 0) {
        await pool.query(
          `INSERT INTO orders_dioptric_values (
            order_item_id,
            ps,
            pc,
            pa,
            padd,
            pp,
            pb,
            ls,
            lc,
            la,
            ladd,
            lp,
            lb
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            orderItemId,
            mappedValues.ps,
            mappedValues.pc,
            mappedValues.pa,
            mappedValues.padd,
            mappedValues.pp,
            mappedValues.pb,
            mappedValues.ls,
            mappedValues.lc,
            mappedValues.la,
            mappedValues.ladd,
            mappedValues.lp,
            mappedValues.lb,
          ],
        );
      }

      const centrationUpdateResult = await pool.query(
        `UPDATE orders_centrations
         SET p_pd = $2,
             p_v = $3,
             p_vd = $4,
             p_panto = $5,
             l_pd = $6,
             l_v = $7,
             l_vd = $8,
             l_panto = $9
         WHERE order_item_id = $1`,
        [
          orderItemId,
          mappedCentrations.p_pd,
          mappedCentrations.p_v,
          mappedCentrations.p_vd,
          mappedCentrations.p_panto,
          mappedCentrations.l_pd,
          mappedCentrations.l_v,
          mappedCentrations.l_vd,
          mappedCentrations.l_panto,
        ],
      );

      if (centrationUpdateResult.rowCount === 0) {
        await pool.query(
          `INSERT INTO orders_centrations (
            order_item_id,
            p_pd,
            p_v,
            p_vd,
            p_panto,
            l_pd,
            l_v,
            l_vd,
            l_panto
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            orderItemId,
            mappedCentrations.p_pd,
            mappedCentrations.p_v,
            mappedCentrations.p_vd,
            mappedCentrations.p_panto,
            mappedCentrations.l_pd,
            mappedCentrations.l_v,
            mappedCentrations.l_vd,
            mappedCentrations.l_panto,
          ],
        );
      }

      savedCount += 1;
    }

    await pool.query("COMMIT");
    return { success: true, saved_count: savedCount };
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Chyba při ukládání dioptrických hodnot:", err);
    throw err;
  }
}

export async function confirmOrderFromDB(order_id, branch_id) {
  try {
    await pool.query("BEGIN");

    const orderResult = await pool.query(
      `SELECT id, status
       FROM orders
       WHERE id = $1
         AND branch_id = $2
       FOR UPDATE`,
      [order_id, branch_id],
    );

    if (orderResult.rows.length === 0) {
      await pool.query("ROLLBACK");
      return { success: false, message: "Zakázka nebyla nalezena" };
    }

    const orderStatus = String(orderResult.rows[0]?.status ?? "").toLowerCase();
    if (orderStatus !== "draft") {
      await pool.query("ROLLBACK");
      return {
        success: false,
        message: "Potvrdit lze pouze zakázku ve stavu DRAFT.",
      };
    }

    const reservationsResult = await pool.query(
      `SELECT id, store_batch_id, quantity
       FROM store_reservations
       WHERE order_id = $1
       FOR UPDATE`,
      [order_id],
    );

    for (const reservation of reservationsResult.rows) {
      const reservationQuantity = Number(reservation.quantity ?? 0);
      const storeBatchId = Number(reservation.store_batch_id);

      if (!Number.isFinite(reservationQuantity) || reservationQuantity <= 0) {
        await pool.query("ROLLBACK");
        return {
          success: false,
          message: "Neplatná quantity v rezervaci.",
        };
      }

      if (!Number.isFinite(storeBatchId) || storeBatchId <= 0) {
        await pool.query("ROLLBACK");
        return {
          success: false,
          message: "Neplatný store_batch_id v rezervaci.",
        };
      }

      const batchUpdateResult = await pool.query(
        `UPDATE store_batches
         SET quantity_sold = COALESCE(quantity_sold, 0) + $1
         WHERE id = $2`,
        [reservationQuantity, storeBatchId],
      );

      if (batchUpdateResult.rowCount === 0) {
        await pool.query("ROLLBACK");
        return {
          success: false,
          message: "Nepodařilo se aktualizovat skladovou šarži.",
        };
      }
    }

    const reservationDeleteResult = await pool.query(
      `DELETE FROM store_reservations
       WHERE order_id = $1`,
      [order_id],
    );

    await pool.query(
      `UPDATE orders
       SET status = 'confirmed'
       WHERE id = $1
         AND branch_id = $2`,
      [order_id, branch_id],
    );

    await pool.query("COMMIT");

    return {
      success: true,
      order_id,
      confirmed: true,
      processed_reservations: reservationsResult.rows.length,
      deleted_reservations: reservationDeleteResult.rowCount,
    };
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Chyba při potvrzení zakázky:", err);
    throw err;
  }
}

export async function deleteDraftObligatoryItemFromDB(
  order_id,
  branch_id,
  store_item_id,
  store_batch_id,
) {
  try {
    await pool.query("BEGIN");

    const orderResult = await pool.query(
      `SELECT id, status
       FROM orders
       WHERE id = $1
         AND branch_id = $2
       LIMIT 1`,
      [order_id, branch_id],
    );

    if (orderResult.rows.length === 0) {
      await pool.query("ROLLBACK");
      return { success: false, message: "Zakázka nebyla nalezena" };
    }

    const orderStatus = String(orderResult.rows[0]?.status ?? "").toLowerCase();

    if (orderStatus !== "draft") {
      await pool.query("ROLLBACK");
      return {
        success: false,
        message: "Položku lze hard-delete odstranit pouze u DRAFT zakázky.",
      };
    }

    const reservationDeleteResult = await pool.query(
      `DELETE FROM store_reservations
       WHERE order_id = $1
         AND store_batch_id = $2`,
      [order_id, store_batch_id],
    );

    const orderItemDeleteResult = await pool.query(
      `DELETE FROM orders_items
       WHERE order_id = $1
         AND store_item_id = $2`,
      [order_id, store_item_id],
    );

    await pool.query("COMMIT");

    return {
      success: true,
      deleted_order_items: orderItemDeleteResult.rowCount,
      deleted_reservations: reservationDeleteResult.rowCount,
    };
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Chyba při hard-delete obligatory položky:", err);
    throw err;
  }
}

export async function deleteDraftGlassesItemsFromDB(
  order_id,
  branch_id,
  order_item_ids = [],
) {
  try {
    await pool.query("BEGIN");

    const orderResult = await pool.query(
      `SELECT id, status
       FROM orders
       WHERE id = $1
         AND branch_id = $2
       LIMIT 1`,
      [order_id, branch_id],
    );

    if (orderResult.rows.length === 0) {
      await pool.query("ROLLBACK");
      return { success: false, message: "Zakázka nebyla nalezena" };
    }

    const orderStatus = String(orderResult.rows[0]?.status ?? "").toLowerCase();

    if (orderStatus !== "draft") {
      await pool.query("ROLLBACK");
      return {
        success: false,
        message: "Položku lze hard-delete odstranit pouze u DRAFT zakázky.",
      };
    }

    if (!Array.isArray(order_item_ids) || order_item_ids.length === 0) {
      await pool.query("COMMIT");
      return { success: true, deleted_order_items: 0, deleted_reservations: 0 };
    }

    const normalizedIds = [
      ...new Set(
        order_item_ids
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0),
      ),
    ];

    if (normalizedIds.length === 0) {
      await pool.query("COMMIT");
      return { success: true, deleted_order_items: 0, deleted_reservations: 0 };
    }

    const targetItemsResult = await pool.query(
      `SELECT id, store_batch_id
       FROM orders_items
       WHERE order_id = $1
         AND id = ANY($2::int[])`,
      [order_id, normalizedIds],
    );

    const existingItemIds = targetItemsResult.rows.map((row) => Number(row.id));
    const reservationBatchIds = targetItemsResult.rows
      .map((row) => Number(row.store_batch_id))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (existingItemIds.length === 0) {
      await pool.query("COMMIT");
      return { success: true, deleted_order_items: 0, deleted_reservations: 0 };
    }

    let reservationDeleteCount = 0;
    if (reservationBatchIds.length > 0) {
      const reservationDeleteResult = await pool.query(
        `DELETE FROM store_reservations
         WHERE order_id = $1
           AND store_batch_id = ANY($2::int[])`,
        [order_id, reservationBatchIds],
      );
      reservationDeleteCount = reservationDeleteResult.rowCount;
    }

    await pool.query(
      `DELETE FROM orders_dioptric_values
       WHERE order_item_id = ANY($1::int[])`,
      [existingItemIds],
    );

    await pool.query(
      `DELETE FROM orders_centrations
       WHERE order_item_id = ANY($1::int[])`,
      [existingItemIds],
    );

    const orderItemDeleteResult = await pool.query(
      `DELETE FROM orders_items
       WHERE order_id = $1
         AND id = ANY($2::int[])`,
      [order_id, existingItemIds],
    );

    await pool.query("COMMIT");

    return {
      success: true,
      deleted_order_items: orderItemDeleteResult.rowCount,
      deleted_reservations: reservationDeleteCount,
    };
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Chyba při hard-delete glasses položek:", err);
    throw err;
  }
}

export async function putInMultipleStoreDB(
  branch_id,
  organization_id,
  items,
  store_id,
) {
  // console.log("Model - putInMultipleStoreDB called with:", {
  //   branch_id,
  //   organization_id,
  //   items,
  //   store_id,
  // });

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
        price: items[`price${suffix}`] ? Number(items[`price${suffix}`]) : 0,
        price_buy: items[`price_buy${suffix}`]
          ? Number(items[`price_buy${suffix}`])
          : 0,
        quantity: items[`quantity${suffix}`]
          ? Number(items[`quantity${suffix}`])
          : 1,

        //STORE 1 a 2 - FRAMES a SUNGLASSES

        collection: items[`collection${suffix}`] || "",
        product: items[`product${suffix}`] || "",
        color: items[`color${suffix}`] || "",
        size: items[`size${suffix}`] || "",
        gender: items[`gender${suffix}`] || "",
        material: items[`material${suffix}`] || "",
        type: items[`type${suffix}`] || "",

        //STORE 3,4,5 - LENS, CONTACT LENS a SOLDDROPS
        catalog_lens_id: items[`id${suffix}`]
          ? Number(items[`id${suffix}`])
          : null,
        catalog_cl_id: items[`id${suffix}`]
          ? Number(items[`id${suffix}`])
          : null,
        catalog_soldrops_id: items[`id${suffix}`]
          ? Number(items[`id${suffix}`])
          : null,
        name: items[`name${suffix}`] || "",
        sph: items[`sph${suffix}`] ? Number(items[`sph${suffix}`]) : 0,
        cyl: items[`cyl${suffix}`] ? Number(items[`cyl${suffix}`]) : 0,
        ax: items[`ax${suffix}`] ? Number(items[`ax${suffix}`]) : 0,
        code: items[`code${suffix}`] || "",
        vat_type_id: items[`vat_type_id${suffix}`]
          ? Number(items[`vat_type_id${suffix}`])
          : null,

        //STORE 6 - GOODS
        model: items[`model${suffix}`] || "",
        vat_rate_id: items[`vat_rate_id${suffix}`]
          ? Number(items[`vat_rate_id${suffix}`])
          : null,
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
    INSERT INTO ${storeTableName} (catalog_cl_id, branch_id, organization_id, plu, sph, cyl, ax, price, vat_type_id, store_item_id, supplier_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;

  const insertSoldropsSQL = `
    INSERT INTO ${storeTableName} (catalog_soldrops_id, branch_id, organization_id, plu, price, vat_type_id, store_item_id, supplier_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;

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
        store_id === 1 || store_id === 2
          ? insertFrameSQL
          : store_id === 3
            ? insertLensSQL
            : store_id === 4
              ? insertCLSQL
              : store_id === 5
                ? insertSoldropsSQL
                : store_id === 6
                  ? insertGoodsSQL
                  : null;
      const insertValues =
        store_id === 1 || store_id === 2
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
                  item.vat_type_id,
                  store_item_id,
                  supplier_id,
                ]
              : store_id === 5
                ? [
                    item.catalog_soldrops_id,
                    branch_id,
                    organization_id,
                    newPlu,
                    item.price,
                    item.vat_type_id,
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
                      item.vat_type_id,
                      item.price,
                      supplier_id,
                    ]
                  : [];

      const result = await pool.query(insertSQL, insertValues);

      pluArray.push(newPlu);
      console.log("Inserted/Updated frame with PLU:", newPlu);
      console.log("Quantity:", item.quantity);
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
    console.log(
      "Model - getCatalogInfoFromDB called with PLU:",
      plu,
      "and catalogType:",
      catalogType,
    );
    const tableName = catalogTables[catalogType] || "catalog_lens";
    console.log("Model - Using table:", tableName);
    const result = await pool.query(
      `SELECT cc.*, c.nick AS supplier_nick
   FROM ${tableName} cc
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

async function reserveBatchAndCreateOrderItem(
  storeItemId,
  salePrice,
  reservationInfo,
) {
  const {
    order_id,
    quantity = 1,
    item_type = "goods",
    group = 0,
    specification_id = null,
    specification = null,
    movement_type = "SALE",
    item_status = "ON_STOCK",
  } = reservationInfo || {};

  const requestedQuantity = Number(quantity);
  const itemGroup = Number(group);

  if (!order_id) {
    return { success: false, message: "order_id je povinné" };
  }

  if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
    return { success: false, message: "Neplatné quantity" };
  }

  if (!Number.isFinite(itemGroup) || itemGroup < 0) {
    return { success: false, message: "Neplatná group" };
  }

  const batchesSql = `
    SELECT sb.id, sb.store_document_id, sb.purchase_price, sb.quantity_received, sb.quantity_sold
    FROM store_batches sb
    WHERE sb.store_item_id = $1
    ORDER BY sb.id ASC
    FOR UPDATE
  `;
  const batchesResult = await pool.query(batchesSql, [storeItemId]);

  let selectedBatch = null;

  for (const batch of batchesResult.rows) {
    const reservedResult = await pool.query(
      `SELECT COALESCE(SUM(quantity), 0)::int AS quantity_reserved
       FROM store_reservations
       WHERE store_batch_id = $1`,
      [batch.id],
    );

    const quantityReserved = Number(
      reservedResult.rows[0]?.quantity_reserved ?? 0,
    );
    const quantityReceived = Number(batch.quantity_received ?? 0);
    const quantitySold = Number(batch.quantity_sold ?? 0);
    const availableQuantity =
      quantityReceived - quantitySold - quantityReserved;

    if (availableQuantity >= requestedQuantity) {
      selectedBatch = {
        ...batch,
        quantity_reserved: quantityReserved,
        available_quantity: availableQuantity,
      };
      break;
    }
  }

  if (!selectedBatch) {
    return {
      success: false,
      message: "Nedostupné množství na skladě pro rezervaci.",
    };
  }

  const orderItemInsert = await pool.query(
    `INSERT INTO orders_items (
      order_id,
      item_type,
      store_item_id,
      quantity,
      unit_purchase_price,
      unit_sale_price,
      specification_id,
      "group",
      store_batch_id,
      movement_type,
      item_status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id`,
    [
      order_id,
      item_type,
      storeItemId,
      requestedQuantity,
      selectedBatch.purchase_price,
      salePrice,
      specification_id,
      itemGroup,
      selectedBatch.id,
      movement_type,
      item_status,
    ],
  );
  const orderItemId = orderItemInsert.rows[0]?.id;

  let resolvedSpecificationId = specification_id;

  if (!resolvedSpecificationId && specification) {
    const existingSpecification = await pool.query(
      `SELECT specification_id
       FROM orders_items
       WHERE order_id = $1
         AND "group" = $2
         AND specification_id IS NOT NULL
       ORDER BY id ASC
       LIMIT 1`,
      [order_id, itemGroup],
    );

    if (existingSpecification.rows.length > 0) {
      resolvedSpecificationId = existingSpecification.rows[0].specification_id;
    } else {
      const specInsert = await pool.query(
        `INSERT INTO orders_lens_specs (order_item_id, specs)
         VALUES ($1, $2::jsonb)
         RETURNING id`,
        [orderItemId, JSON.stringify(specification)],
      );
      resolvedSpecificationId = specInsert.rows[0]?.id ?? null;
    }
  }

  if (resolvedSpecificationId) {
    await pool.query(
      `UPDATE orders_items
       SET specification_id = $1
       WHERE id = $2`,
      [resolvedSpecificationId, orderItemId],
    );
  }

  await pool.query(
    `INSERT INTO store_reservations (store_batch_id, order_id, quantity)
     VALUES ($1, $2, $3)`,
    [selectedBatch.id, order_id, requestedQuantity],
  );

  return {
    success: true,
    reservation: {
      order_item_id: orderItemId,
      specification_id: resolvedSpecificationId,
      store_batch_id: selectedBatch.id,
      store_document_id: selectedBatch.store_document_id,
      purchase_price: selectedBatch.purchase_price,
      quantity_reserved: selectedBatch.quantity_reserved,
      available_quantity: selectedBatch.available_quantity,
    },
  };
}

async function createOrderItemWithoutStock(salePrice, orderItemInfo) {
  const {
    order_id,
    quantity = 1,
    item_type = "service",
    group = 0,
    specification_id = null,
    specification = null,
    movement_type = "SALE",
    item_status = "ON_STOCK",
  } = orderItemInfo || {};

  const requestedQuantity = Number(quantity);
  const itemGroup = Number(group);

  if (!order_id) {
    return { success: false, message: "order_id je povinné" };
  }

  if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
    return { success: false, message: "Neplatné quantity" };
  }

  if (!Number.isFinite(itemGroup) || itemGroup < 0) {
    return { success: false, message: "Neplatná group" };
  }

  const orderItemInsert = await pool.query(
    `INSERT INTO orders_items (
      order_id,
      item_type,
      store_item_id,
      quantity,
      unit_purchase_price,
      unit_sale_price,
      specification_id,
      "group",
      store_batch_id,
      movement_type,
      item_status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id`,
    [
      order_id,
      item_type,
      null,
      requestedQuantity,
      0,
      Number(salePrice ?? 0),
      specification_id,
      itemGroup,
      null,
      movement_type,
      item_status,
    ],
  );

  const orderItemId = orderItemInsert.rows[0]?.id;
  let resolvedSpecificationId = specification_id;

  if (!resolvedSpecificationId && specification) {
    const existingSpecification = await pool.query(
      `SELECT specification_id
       FROM orders_items
       WHERE order_id = $1
         AND "group" = $2
         AND specification_id IS NOT NULL
       ORDER BY id ASC
       LIMIT 1`,
      [order_id, itemGroup],
    );

    if (existingSpecification.rows.length > 0) {
      resolvedSpecificationId = existingSpecification.rows[0].specification_id;
    } else {
      const specInsert = await pool.query(
        `INSERT INTO orders_lens_specs (order_item_id, specs)
         VALUES ($1, $2::jsonb)
         RETURNING id`,
        [orderItemId, JSON.stringify(specification)],
      );
      resolvedSpecificationId = specInsert.rows[0]?.id ?? null;
    }
  }

  if (resolvedSpecificationId) {
    await pool.query(
      `UPDATE orders_items
       SET specification_id = $1
       WHERE id = $2`,
      [resolvedSpecificationId, orderItemId],
    );
  }

  return {
    success: true,
    order_item_id: orderItemId,
    specification_id: resolvedSpecificationId,
  };
}

export async function getPluItemFromDB(plu, branch_id, reservationInfo = {}) {
  const { order_id, quantity = 1 } = reservationInfo || {};

  if (!order_id) {
    return { success: false, message: "order_id je povinné" };
  }

  if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
    return { success: false, message: "Neplatné quantity" };
  }

  // Projde všechny tabulky store a najde položku podle PLU
  const tables = [
    // "store_frames",
    // "store_sunglasses",
    // "store_lens",
    // "store_cl",
    // "store_soldrops",
    "store_goods",
  ];

  try {
    await pool.query("BEGIN");

    let foundItem = null;

    for (const table of tables) {
      const sql = `SELECT sg.model, sg.size, sg.color, sg.uom, sg.price, sg.vat_type_id, sg.store_item_id, vr.rate 
                   FROM ${table} sg 
                   LEFT JOIN vat_rates vr ON vr.id = sg.vat_type_id 
                   WHERE sg.plu = $1 AND sg.branch_id = $2 LIMIT 1`;
      const result = await pool.query(sql, [plu, branch_id]);

      if (result.rows.length > 0) {
        foundItem = result.rows[0];
        break;
      }
    }

    if (!foundItem) {
      await pool.query("COMMIT");
      return { success: false, message: "Položka s daným PLU nebyla nalezena" };
    }

    const reserveResult = await reserveBatchAndCreateOrderItem(
      foundItem.store_item_id,
      Number(foundItem.price ?? 0),
      reservationInfo,
    );

    if (!reserveResult.success) {
      await pool.query("COMMIT");
      return reserveResult;
    }

    await pool.query("COMMIT");

    return {
      success: true,
      item: {
        ...foundItem,
        ...reserveResult.reservation,
      },
    };
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Chyba při načítání položky podle PLU:", err);
    throw err;
  }
}

export async function getPluFrameFromDB(
  plu,
  branch_id,
  reservationInfo = null,
) {
  try {
    await pool.query("BEGIN");

    const sql = `SELECT sf.*, c.nick AS supplier_nick
                 FROM store_frames sf
                 LEFT JOIN contacts c ON c.id = sf.supplier_id
                 WHERE sf.plu = $1 AND sf.branch_id = $2 
                 LIMIT 1`;
    const result = await pool.query(sql, [plu, branch_id]);

    if (result.rows.length > 0) {
      const frame = result.rows[0];

      if (reservationInfo?.order_id) {
        const reserveResult = await reserveBatchAndCreateOrderItem(
          frame.store_item_id,
          Number(frame.price ?? 0),
          reservationInfo,
        );

        if (!reserveResult.success) {
          await pool.query("COMMIT");
          return reserveResult;
        }

        await pool.query("COMMIT");
        return {
          success: true,
          frame: { ...frame, ...reserveResult.reservation },
        };
      }

      await pool.query("COMMIT");
      return { success: true, frame };
    }

    await pool.query("COMMIT");
    return { success: false, message: "Obruba s daným PLU nebyla nalezena" };
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Chyba při načítání obruby podle PLU:", err);
    throw err;
  }
}

export async function getPluServiceFromDB(
  plu,
  branch_id,
  orderItemInfo = null,
) {
  try {
    await pool.query("BEGIN");

    const sql = `SELECT asv.*, vr.rate
                 FROM agenda_services asv
                 LEFT JOIN vat_rates vr ON vr.id = asv.vat_type
                 WHERE asv.plu = $1 AND asv.branch_id = $2
                 LIMIT 1`;
    const result = await pool.query(sql, [plu, branch_id]);

    if (result.rows.length > 0) {
      const service = result.rows[0];

      if (orderItemInfo?.order_id) {
        const orderItemResult = await createOrderItemWithoutStock(
          Number(service.price ?? 0),
          orderItemInfo,
        );

        if (!orderItemResult.success) {
          await pool.query("COMMIT");
          return orderItemResult;
        }

        await pool.query("COMMIT");
        return {
          success: true,
          service: {
            ...service,
            order_item_id: orderItemResult.order_item_id,
          },
        };
      }

      await pool.query("COMMIT");
      return { success: true, service };
    }

    await pool.query("COMMIT");
    return { success: false, message: "Služba s daným PLU nebyla nalezena" };
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Chyba při načítání služby podle PLU:", err);
    throw err;
  }
}

export async function getPluLensesFromDB(
  plu,
  branch_id,
  reservationInfo = null,
) {
  try {
    await pool.query("BEGIN");

    const sql = `SELECT sl.*, 0 AS rate
                 FROM store_lens sl
                 WHERE sl.plu = $1 AND sl.branch_id = $2
                 LIMIT 1`;
    const result = await pool.query(sql, [plu, branch_id]);

    if (result.rows.length > 0) {
      const lenses = result.rows[0];

      if (reservationInfo?.order_id) {
        const reserveResult = await reserveBatchAndCreateOrderItem(
          lenses.store_item_id,
          Number(lenses.price ?? 0),
          reservationInfo,
        );

        if (!reserveResult.success) {
          await pool.query("COMMIT");
          return reserveResult;
        }

        await pool.query("COMMIT");
        return {
          success: true,
          lenses: { ...lenses, ...reserveResult.reservation },
        };
      }

      await pool.query("COMMIT");
      return { success: true, lenses };
    }

    await pool.query("COMMIT");
    return {
      success: false,
      message: "Brýlové čočky s daným PLU nebyly nalezeny",
    };
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Chyba při načítání brýlových čoček podle PLU:", err);
    throw err;
  }
}
