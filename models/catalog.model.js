import e from "express";
import pool from "../db/index.js";

export async function searchForCLFromDB(body, limit, offset, page) {
  try {
    //hledání řetězce
    const { rows: items } = await pool.query("SELECT * FROM catalog_cl");
    //zjišťování velikosti
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS total FROM catalog_cl"
    );
    const totalCount = rows[0]?.total ?? 0;
    return {
      items,
      totalCount,
    };
  } catch (err) {
    console.error("Chyba při načítání CL z katalogu:", err);
    throw err;
  }
}

export async function searchForLensFromDB(lensSearchConditions) {
  try {
    console.log("lensSearchConditions v modelu:", lensSearchConditions.pS);

    //hledání řetězce
    // const { rows: items } = await pool.query(
    //   "SELECT l.*, m.name AS manufact_name, COALESCE(array_agg(c ORDER BY c.id) FILTER (WHERE c.id IS NOT NULL),'{}') AS colors_data, COALESCE(array_agg(lay ORDER BY lay.id) FILTER (WHERE lay.id IS NOT NULL),'{}') AS layers_data FROM catalog_lens l JOIN catalog_manufact m ON m.id = l.id_manufact LEFT JOIN catalog_color c ON c.id = ANY(l.colors) LEFT JOIN catalog_layers lay ON lay.id = ANY(l.layers) WHERE $1::smallint BETWEEN l.range_start AND l.range_end GROUP BY l.id, m.name", [lensSearchConditions.pS])
    // const { rows: manufacturers } = await pool.query(
    //   "SELECT * FROM catalog_manufact WHERE id = ANY($1::int[])",

    const { rows: items } = await pool.query(
      "SELECT l.*, man.manufact_data, col.colors_data, lay.layers_data FROM catalog_lens l LEFT JOIN LATERAL (SELECT to_jsonb(m) AS manufact_data FROM catalog_manufact m WHERE m.id = l.id_manufact) man ON true LEFT JOIN LATERAL (SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.id), '[]'::jsonb) AS colors_data FROM catalog_color c WHERE c.id = ANY(l.colors)) col ON true LEFT JOIN LATERAL (SELECT COALESCE(jsonb_agg(to_jsonb(lay) ORDER BY lay.id), '[]'::jsonb) AS layers_data FROM catalog_layers lay WHERE lay.id = ANY(l.layers)) lay ON true WHERE $1 BETWEEN l.range_start AND l.range_end AND $2 BETWEEN l.range_start AND l.range_end AND $3 <= l.range_cyl AND $4 <= l.range_cyl AND l.range_dia @> ARRAY[$5]::smallint[]",
      [
        lensSearchConditions.pS,
        lensSearchConditions.lS,
        lensSearchConditions.pC,
        lensSearchConditions.lC,
        lensSearchConditions.diameter,
      ]
    );

    //  lensSearchConditions.index, lensSearchConditions.design, lensSearchConditions.material, lensSearchConditions.func, lensSearchConditions.layer

    //zjišťování velikosti
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS total FROM catalog_lens"
    );

    const totalCount = rows[0]?.total ?? 0;
    return {
      items,
      totalCount,
    };
  } catch (err) {
    console.error("Chyba při načítání brýlových čoček z katalogu:", err);
    throw err;
  }
}

export async function invoicesListFromDB(body) {
  try {
    const result = await pool.query(
      "SELECT * FROM invoices WHERE id_branch = $1",
      [body.id_branch]
    ); // Add filtering based on body if needed
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

export async function searchForSoldropsFromDB(body) {
  try {
    //hledání řetězce
    const result = await pool.query("SELECT * FROM catalog_soldrops");

    return result.rows;
  } catch (err) {
    console.error("Chyba při načítání roztoků a kapek z katalogu:", err);
    throw err;
  }
}

export async function searchForServicesFromDB(body) {
  try {
    //hledání řetězce
    const { rows: items } = await pool.query("SELECT * FROM catalog_services");

    return items;
  } catch (err) {
    console.error("Chyba při načítání služeb z katalogu:", err);
    throw err;
  }
}
