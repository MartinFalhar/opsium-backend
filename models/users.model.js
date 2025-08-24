// import pool from "../db.js";
import express from "express";
import axios from "axios";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import pkg from "pg";
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
    await pool.query("INSERT INTO users (email, password) VALUES ($1, $2)", [
      email,
      hash,
    ]);
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
