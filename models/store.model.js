import pool from "../db/index.js";

export async function searchInStoreFromDB(body, limit, offset, page) {
  const likePattern = body.searchText ? `%${body.searchText}%` : `%`;

  try {
    //hledání řetězce
    const { rows: items } = await pool.query(
      "SELECT * FROM store WHERE collection ILIKE $1 ORDER BY ean DESC LIMIT $2 OFFSET $3",
      [likePattern, limit, offset]
    );

    //zjišťování velikosti
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS total FROM store WHERE collection ILIKE $1",
      [likePattern]
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

