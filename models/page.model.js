import pool from "../db/index.js";
// import express from "express";
// import axios from "axios";
// import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
// import fs from "fs";
// import path from "path";

const saltRounds = 10;


// Kontrola přihlášení uživatele
export async function login(email, password) {
  try {
    // Načteme uživatele a jeho pobočku pomocí JOIN
    const result = await pool.query(
      `SELECT u.*, b.id as id_branch 
       FROM users u 
       LEFT JOIN branches b ON u.id = b.id_users 
       WHERE u.email = $1`,
      [email]
    );
    
    if (result.rows.length > 0) {
      const storedUser = result.rows[0];
      console.log("Stored user fetched for login:", storedUser);
      const storedPassword = storedUser.password;
      const match = await bcrypt.compare(password, storedPassword);

      return match ? storedUser : false; // vrací uživatele včetně id_branch, pokud je heslo správné
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