import e from "express";
import pool from "../db/index.js";

export async function searchForCLFromDB(body, limit, offset, page) {
 
  try {
    //hledání řetězce
    const { rows: items } = await pool.query(
      "SELECT * FROM catalog_cl"
    );
    //zjišťování velikosti
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS total FROM catalog_cl",    
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

export async function searchForLensFromDB(body, limit, offset, page) {
    try {
    //hledání řetězce
    const { rows: items } = await pool.query(
      "SELECT * FROM catalog_lens"
    );
    //zjišťování velikosti
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS total FROM catalog_lens",    
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