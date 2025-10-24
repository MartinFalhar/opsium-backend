// import pool from "../db.js";
import express from "express";
import axios from "axios";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import pkg from "pg";
import fs from "fs";
import path from "path";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: String(process.env.DATABASE_URL), // Render ti tuto proměnnou nastaví automaticky
  ssl: { rejectUnauthorized: false }, // důležité kvůli certifikátu
});
// const connection = await mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
// });

const saltRounds = 10;

// Vytvoření připojení k databázi
async function dbConnect() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

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
export async function insertNewUser(email, password) {
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    await pool.query(
      "INSERT INTO users (name, surname, email, password, rights, organization, avater) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [name, surname, email, hash, rights, organization, avatar]
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
