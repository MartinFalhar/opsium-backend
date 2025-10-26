import pool from "../db/index.js";
import express from "express";
import axios from "axios";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";


const saltRounds = 10;



// Kontrola přihlášení uživatele
export async function login(email, password) {
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length > 0) {
      const storedUser = result.rows[0];

      const storedPassword = storedUser.password;
      const match = await bcrypt.compare(password, storedPassword);

      return match ? storedUser : false; // vrací uživatele, pokud je heslo správné
    } else {
      return false;
    }
  } catch (err) {
    console.error("Chyba při přihlášení:", err);
    throw err;
  }
}
// export async function login(email, password) {
//   const connection = await dbConnect();
//   try {
//     const [result] = await connection.query(
//       "SELECT * FROM users WHERE email = ?",
//       [email]
//     );
//     if (result.length > 0) {
//       const storedPassword = result[0].password;
//       const match = bcrypt.compare(password, storedPassword);
//       return match;
//     } else {
//       return false;
//     }
//   } catch (err) {
//     console.error("Chyba při načítání dat:", err);
//   } finally {
//     await connection.end();
//   }
// }

// Kontrola existence uživatele
export async function existUser(email) {
  try {
    const result = await pool.query(
      "SELECT email FROM users WHERE email = $1",
      [email]
    );
    console.log("Existence uživatele:", result.rows.length > 0);
    return result.rows.length > 0;
  } catch (err) {
    console.error("Chyba při kontrole existence uživatele:", err);
    throw err;
  }
}

export async function clientExists(email) {
  try {
    const result = await pool.query(
      "SELECT email FROM users WHERE email = $1",
      [email]
    );
    console.log("Existence uživatele:", result.rows.length > 0);
    return result.rows.length > 0;
  } catch (err) {
    console.error("Chyba při kontrole existence uživatele:", err);
    throw err;
  }
}

// export async function existUser(email) {
//   const connection = await dbConnect();
//   try {
//     const [checkResult] = await connection.query(
//       "SELECT email FROM users WHERE email = ?",
//       [email]
//     );
//     return checkResult.length > 0 ? true : false;
//   } catch (err) {
//     console.error("Chyba při načítání dat:", err);
//   } finally {
//     await connection.end();
//   }
// }

// Kontrola existence uživatele
// Vložení nového uživatele
export async function insertNewUser(user) {
  // očekáváme objekt user: { name, surname, email, password, rights, organization, avatar }
  console.log("BCKD insertNewUser:", user);
  try {
    const {
      name,
      surname = null,
      email,
      password,
      rights,
      organization = user.organization,
      avatar = null,
    } = user || {};

    if (!name || !email || !password) {
      throw new Error("Missing required user fields: name, email or password");
    }

    const hash = await bcrypt.hash(password, saltRounds);

    await pool.query(
      "INSERT INTO users (name, surname, email, password, rights, organization, avatar) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [
        name,
        surname,
        email,
        hash,
        rights,
        organization,
        avatar,
      ]
    );
  } catch (err) {
    console.error("Chyba při registraci uživatele:", err);
    throw err;
  }
}

export async function insertNewAdmin(user) {
  console.log("BCKD insertNewAdmin:", user);
  try {
    const {
      adm_name = `${user.name}`,
      adm_surname = `${user.surname}`,
      adm_email =`${user.email}`,
      adm_password = `${user.password}`,
      adm_rights = `${user.rights}`,
      adm_organization,
      avatar = null,
      org_name = `${user.name + " Org"}`,
      org_street = "neuvedena",
      city = "neuvedeno",
      org_postal_code = null,
      org_ico = null,
      org_dic = null,
      org_id_admin,
    } = user || {};

    const hash = await bcrypt.hash(adm_password, saltRounds);

    await pool.query("BEGIN");

    const userResult = await pool.query(
      "INSERT INTO users (name, surname, email, password, rights) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [adm_name, adm_surname, adm_email, hash, adm_rights]
    );
    const newAdminID = userResult.rows[0].id;
    console.log("BCKD New Admin ID:", newAdminID);
    const orgResult = await pool.query(
      "INSERT INTO organizations (name, id_admin) VALUES ($1, $2) RETURNING organization_id",
      [org_name, newAdminID]
    );
    const organizationId = orgResult.rows[0].organization_id;

    await pool.query("UPDATE users SET organization = $1 WHERE id = $2", [
      organizationId,
      newAdminID,
    ]);

    await pool.query("COMMIT");
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

export async function insertNewOrganization(user) {
  // očekáváme objekt user: { name, surname, email, password, rights, organization, avatar }
  try {
    const {
      name = `${user.name + " Org"}`,
      street = "neuvedena",
      city = "neuvedeno",
      postal_code = null,
      ico = null,
      dic = null,
      id_admin = user.id,
    } = user || {};

    await pool.query(
      "INSERT INTO organizations (name, street, city, postal_code, ICO, DIC, id_admin) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [name, street, city, postal_code, ico, dic, id_admin]
    );
  } catch (err) {
    console.error("Chyba při registraci uživatele:", err);
    throw err;
  }
}

// export async function insertNewUser(email, password) {
//   const connection = await dbConnect();
//   // Hash the password before storing it
//   bcrypt.hash(password, saltRounds, async (err, hash) => {
//     try {
//       await connection.query(
//         "INSERT INTO users (email, password) VALUES (?, ?)",
//         [email, hash]
//       );
//     } catch (err) {
//       console.error("Chyba při načítání dat:", err);
//     } finally {
//       await connection.end(); // připojení ukonči vždy po dokončení práce
//     }
//     if (err) {
//       console.error("Error hashing password:", err);
//       return res.status(500).send("Internal Server Error");
//     }
//   });
// }

export async function saveOptotypToDB(body) {
  console.log(body);
  try {
    await pool.query(
      "INSERT INTO optotyp (users_id, optotyp_set) VALUES ($1, $2::jsonb)",
      [JSON.stringify(body.userId), JSON.stringify(body.tests)]
    );
  } catch (err) {
    console.error("Chyba při ukládání optotypu:", err);
    throw err;
  }
}

export async function loadOptotypFromDB(body) {
  try {
    const result = await pool.query(
      "SELECT optotyp_set FROM optotyp WHERE users_id = $1",
      [JSON.stringify(body.userId)]
    );
    // Pokud očekáváš jeden záznam:
    if (result.rows.length > 0) {
      // optotyp_set je už objekt (pokud je sloupec JSONB)
      return result.rows.map((row) => row.optotyp_set);
    } else {
      return null; // nebo [], podle potřeby
    }
  } catch (err) {
    console.error("Chyba při ukládání optotypu:", err);
    throw err;
  }
}

export async function heroImgInfoFromDB(body) {
  console.log(`body INFO  heriImg ${body.id}`);
  try {
    const result = await pool.query("SELECT * FROM hero_img WHERE id = $1", [
      JSON.stringify(body.id),
    ]);
    if (result.rows.length > 0) {
      // optotyp_set je už objekt (pokud je sloupec JSONB)
      return result.rows;
    } else {
      console.log("BCKD HEROIMG error");
      return null; // nebo [], podle potřeby
    }
  } catch (err) {
    console.error("Chyba při načítání heroIMG:", err);
    throw err;
  }
}

// export async function heroImgFromDB(req, res) {
//   const __dirname = path.resolve();
//   const imagePath = path.join(__dirname, "uploads/hero_img/hero01.png");
//   console.log(`BCK IMAGA ${imagePath}`)
//   res.sendFile(imagePath);
// }

export async function loadClientsFromDB(body) {
  try {
    const result = await pool.query("SELECT * FROM clients"); // Add filtering based on body if needed
    if (result.rows.length > 0) {
      return result.rows;
    } else {
      return []; // or null, based on your needs
    }
  } catch (err) {
    console.error("Chyba při načítání klientů:", err);
    throw err;
  }
}

export async function loadAdminsFromDB() {
  try {
    const minRights = 10;
    const page = 1; // stránka, kterou chceme zobrazit (1 = první stránka)
    const pageSize = 10; // kolik záznamů na stránku
    const offset = (page - 1) * pageSize;

    const result = await pool.query(
      "SELECT * FROM users WHERE rights >= $1 ORDER BY rights DESC LIMIT $2 OFFSET $3",
      [minRights, pageSize, offset]
    );
    if (result.rows.length > 0) {
      return result.rows;
    } else {
      return []; // or null, based on your needs
    }
  } catch (err) {
    console.error("Chyba při načítání klientů:", err);
    throw err;
  }
}

export async function loadUsersFromDB(organization) {
  try {
    const minRights = 1;
    const page = 1; // stránka, kterou chceme zobrazit (1 = první stránka)
    const pageSize = 10; // kolik záznamů na stránku
    const offset = (page - 1) * pageSize;

    const result = await pool.query(
      "SELECT * FROM users WHERE rights = $1 AND organization = $2 ORDER BY rights DESC LIMIT $3 OFFSET $4",
      [minRights, organization, pageSize, offset]
    );
    console.log("BCKD usersList result:", result.rows);
    if (result.rows.length > 0) {
      return result.rows;
    } else {
      return []; // or null, based on your needs
    }
  } catch (err) {
    console.error("Chyba při načítání klientů:", err);
    throw err;
  }
}

