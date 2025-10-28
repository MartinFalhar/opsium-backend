import pool from "../db/index.js";
import express from "express";
import axios from "axios";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";

const saltRounds = 10;

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

export async function existMember(name, surname) {
  try {
    const result = await pool.query(
      "SELECT name, surname FROM members WHERE name = $1 AND surname = $2",
      [name, surname]
    );
    console.log("Existence member:", result.rows.length > 0);
    return result.rows.length > 0;
  } catch (err) {
    console.error("Chyba při kontrole existence člena:", err);
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

export async function insertNewAdmin(user) {
  console.log("BCKD insertNewAdmin:", user);
  try {
    const {
      adm_name = `${user.name}`,
      adm_surname = `${user.surname}`,
      adm_email = `${user.email}`,
      adm_password = `${user.password}`,
      adm_rights = `${user.rights}`,
      adm_organization,
      avatar = null,
      org_name = `${user.name + " Org"}`,
      org_street = "<nezadáno>",
      org_city = "<nezadáno>",
      org_postal_code = 12345,
      org_ico = 12345678,
      org_dic = "CZ12345678",
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
      "INSERT INTO organizations (name, street, city, postal_code, ico, dic, id_admin) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      [
        org_name,
        org_street,
        org_city,
        org_postal_code,
        org_ico,
        org_dic,
        newAdminID,
      ]
    );
    const organizationId = orgResult.rows[0].id;

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
      [name, surname, email, hash, rights, organization, avatar]
    );
  } catch (err) {
    console.error("Chyba při registraci uživatele:", err);
    throw err;
  }
}

export async function insertNewMember(member) {
  // očekáváme objekt user: { name, surname, email, password, rights, organization, avatar }
  console.log("BCKD insertNewMember:", member);
  try {
    const {
      name,
      surname,
      nick,
      pin,
      userID = member.id_user, //Parents ID 
    } = member || {};

    if (!name || !surname || !pin) {
      throw new Error("Missing required member fields: name, email or pin");
    }

    const hash = await bcrypt.hash(pin, saltRounds);

    await pool.query(
      "INSERT INTO members (name, surname, nick, pin, id_admin) VALUES ($1, $2, $3, $4, $5)",
      [name, surname, nick, pin, userID]
    );
  } catch (err) {
    console.error("Chyba při registraci člena:", err);
    throw err;
  }
}

export async function insertNewOrganization(user) {
  // očekáváme objekt user: { name, surname, email, password, rights, organization, avatar }
  try {
    const {
      name = `${user.surname + " Company"}`,
      street = "<nezadáno>",
      city = "<nezadáno>",
      postal_code = 12345,
      ico = 12345678,
      dic = "CZ12345678",
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

export async function loadMembersFromDB(id_admin) {
  try {
    const minRights = 1;
    const page = 1; // stránka, kterou chceme zobrazit (1 = první stránka)
    const pageSize = 10; // kolik záznamů na stránku
    const offset = (page - 1) * pageSize;

    const result = await pool.query(
      "SELECT * FROM members WHERE id_admin = $1 ORDER BY surname DESC LIMIT $2 OFFSET $3",
      [id_admin, pageSize, offset]
    );
    if (result.rows.length > 0) {
      return result.rows;
    } else {
      return []; // or null, based on your needs
    }
  } catch (err) {
    console.error("Chyba při načítání členů:", err);
    throw err;
  }
}