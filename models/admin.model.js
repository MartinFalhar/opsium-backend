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
    return result.rows.length > 0;
  } catch (err) {
    console.error("Chyba při kontrole existence uživatele:", err);
    throw err;
  }
}

export async function existBranch(name) {
  try {
    const result = await pool.query(
      "SELECT name FROM branches WHERE name = $1",
      [name]
    );
    return result.rows.length > 0;
  } catch (err) {
    console.error("Chyba při kontrole existence pobočky:", err);
    throw err;
  }
}
export async function existMember(name, surname) {
  try {
    const result = await pool.query(
      "SELECT name, surname FROM members WHERE name = $1 AND surname = $2",
      [name, surname]
    );
    return result.rows.length > 0;
  } catch (err) {
    console.error("Chyba při kontrole existence člena:", err);
    throw err;
  }
}

export async function insertNewAdmin(user) {
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
    } = user || {};

    const hash = await bcrypt.hash(adm_password, saltRounds);

    await pool.query("BEGIN");

    const userResult = await pool.query(
      "INSERT INTO users (name, surname, email, password, rights) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [adm_name, adm_surname, adm_email, hash, adm_rights]
    );
    const newAdminID = userResult.rows[0].id;
    const orgResult = await pool.query(
      "INSERT INTO organizations (name, street, city, postal_code, ico, dic) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [org_name, org_street, org_city, org_postal_code, org_ico, org_dic]
    );
    const organizationId = orgResult.rows[0].id;

    await pool.query("UPDATE users SET organization_id = $1 WHERE id = $2", [
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

export async function insertNewBranch(branch) {
  // očekáváme objekt user: { name, surname, email, password, rights, organization, avatar }

  try {
    const {
      user_id = branch.user_id,
      branch_name: branch_name,
      street = branch.street,
      city = branch.city,
      postal_code = branch.postal_code,
      open_hours = { "pondělí": "08:00-17:00" },
      branch_phone = { "phone": "<nezadáno>" },
      branch_email = { "email": "<nezadáno>" },
      organization_id = branch.organization_id,
    } = branch || {};

    if (!branch_name) {
      throw new Error("Missing required branch field: branch_name");
    }

    await pool.query(
      "INSERT INTO branches (name, street, city, postal_code, open_hours, phone, email, organization_id, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [
        branch_name,
        street,
        city,
        postal_code,
        open_hours,
        branch_phone,
        branch_email,
        organization_id,
        user_id
      ]
    );
  } catch (err) {
    console.error("Chyba při registraci nové pobočky:", err);
    throw err;
  }
}
export async function insertNewUser(user) {
  // očekáváme objekt user: { name, surname, email, password, rights, organization, avatar }
  try {
    const {
      name,
      surname = null,
      email,
      password,
      rights,
      organization_id = user.organization_id,
    } = user || {};

    if (!name || !email || !password) {
      throw new Error("Missing required user fields: name, email or password");
    }

    const hash = await bcrypt.hash(password, saltRounds);

    const newAdminID = await pool.query(
      "INSERT INTO users (name, surname, email, password, rights, organization_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [name, surname, email, hash, rights, organization_id]
    );
    return newAdminID.rows[0].id;
  } catch (err) {
    console.error("Chyba při registraci uživatele:", err);
    throw err;
  }
}

export async function insertNewMember(member) {
  // očekáváme objekt user: { name, surname, email, password, rights, organization, avatar }
  try {
    const {
      name,
      surname,
      nick,
      pin,
      userID = member.user_id, //Parents ID
    } = member || {};

    if (!name || !surname || !pin) {
      throw new Error("Missing required member fields: name, email or pin");
    }

    const hash = await bcrypt.hash(pin, saltRounds);

    await pool.query(
      "INSERT INTO members (name, surname, nick, pin, admin_id) VALUES ($1, $2, $3, $4, $5)",
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
      admin_id = user.id,
    } = user || {};

    await pool.query(
      "INSERT INTO organizations (name, street, city, postal_code, ICO, DIC, admin_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [name, street, city, postal_code, ico, dic, admin_id]
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
      "SELECT * FROM users WHERE rights = $1 AND organization_id = $2 ORDER BY rights DESC LIMIT $3 OFFSET $4",
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

export async function loadBranchesFromDB(organization_id) {
  try {
    const minRights = 1;
    const page = 1; // stránka, kterou chceme zobrazit (1 = první stránka)
    const pageSize = 10; // kolik záznamů na stránku
    const offset = (page - 1) * pageSize;

    const result = await pool.query(
      "SELECT * FROM branches WHERE organization_id = $1 ORDER BY name DESC LIMIT $2 OFFSET $3",
      [organization_id, pageSize, offset]
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

export async function loadMembersFromDB(organization_id) {
  try {
    const minRights = 1;
    const page = 1; // stránka, kterou chceme zobrazit (1 = první stránka)
    const pageSize = 10; // kolik záznamů na stránku
    const offset = (page - 1) * pageSize;

    const result = await pool.query(
      "SELECT * FROM members WHERE organization_id = $1 ORDER BY surname DESC LIMIT $2 OFFSET $3",
      [organization_id, pageSize, offset]
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

export async function superadminInfoFromDB() {
  const dataOpsiumInfo = {
    countAdmin: 0,
    countTotal: 0,
    countTotalBranches: 0,
    countTotalMembers: 0,
    countTotalClients: 0,
  };

  try {
    //CountAdmin
    const adminRights = 10;
    const res01 = await pool.query(
      "SELECT COUNT(*) AS countadmincount FROM users WHERE rights = $1",
      [adminRights]
    );
    dataOpsiumInfo.countAdmin = Number(res01.rows[0].countadmincount);

    //CountTotal
    const res02 = await pool.query("SELECT COUNT(*) AS counttotal FROM users");
    dataOpsiumInfo.countTotal = Number(res02.rows[0].counttotal);

    //CountBranches
    const res03 = await pool.query(
      "SELECT COUNT(*) AS countbranches FROM branches"
    );
    dataOpsiumInfo.countTotalBranches = Number(res03.rows[0].countbranches);

    //CountMembers
    const res04 = await pool.query(
      "SELECT COUNT(*) AS countmembers FROM members"
    );
    dataOpsiumInfo.countTotalMembers = Number(res04.rows[0].countmembers);

    //CountClients
    const res05 = await pool.query(
      "SELECT COUNT(*) AS countclients FROM clients"
    );
    dataOpsiumInfo.countTotalClients = Number(res05.rows[0].countclients);

    return dataOpsiumInfo;
  } catch (err) {
    console.error("Chyba při MODUL SUPERADMIN OPSIUM INFO:", err);
    throw err;
  }
}

export async function adminInfoFromDB(organization_id) {
  const dataAdminInfo = {
    countTotal: 0,
    countTotalBranches: 0,
    countTotalMembers: 0,
    countTotalClients: 0,
  };

  try {
    //CountTotal
    const res02 = await pool.query(
      "SELECT COUNT(*) AS counttotal FROM users WHERE organization_id = $1",
      [organization_id]
    );
    dataAdminInfo.countTotal = Number(res02.rows[0].counttotal);

    //CountBranches
    const res03 = await pool.query(
      "SELECT COUNT(*) AS countbranches FROM branches WHERE organization_id = $1",
      [organization_id]
    );
    dataAdminInfo.countTotalBranches = Number(res03.rows[0].countbranches);

    //CountMembers
    const res04 = await pool.query(
      "SELECT COUNT(*) AS countmembers FROM members WHERE organization_id = $1",
      [organization_id]
    );
    dataAdminInfo.countTotalMembers = Number(res04.rows[0].countmembers);

    //CountClients
    const res05 = await pool.query(
      "SELECT COUNT(*) AS countclients FROM clients WHERE organization_id = $1",
      [organization_id]
    );
    dataAdminInfo.countTotalClients = Number(res05.rows[0].countclients);

    return dataAdminInfo;
  } catch (err) {
    console.error("Chyba při MODUL ADMIN OPSIUM INFO:", err);
    throw err;
  }
}

export async function organizationInfoFromDB(organization_id) {
  const dataOrganizationInfo = {
    name: "",
    street: "",
    city: "",
    postal_code: "",
    ico: "",
    dic: "",
    phone: {},
    email: {},
  };

  try {
    //CountTotal
    const organizationInfo = await pool.query(
      "SELECT * FROM organizations WHERE id = $1",
      [organization_id]
    );
    dataOrganizationInfo.name = organizationInfo.rows[0].name;
    dataOrganizationInfo.street = organizationInfo.rows[0].street;
    dataOrganizationInfo.city = organizationInfo.rows[0].city;
    dataOrganizationInfo.postal_code = organizationInfo.rows[0].postal_code;
    dataOrganizationInfo.ico = organizationInfo.rows[0].ico;
    dataOrganizationInfo.dic = organizationInfo.rows[0].dic;
    dataOrganizationInfo.phone = organizationInfo.rows[0].phone;
    dataOrganizationInfo.email = organizationInfo.rows[0].email;
    return dataOrganizationInfo;
  } catch (err) {
    console.error("Chyba při MODUL ORGANIZATION OPSIUM INFO:", err);
    throw err;
  }
}

export async function branchInfoFromDB(user_id) {
  const dataBranchInfo = {
    id: 0,
    name: "",
    street: "",
    city: "",
    postal_code: "",
    ico: 0,
    dic: "",
    phone: {},
    email: {},
    open_hours: {},
  };

  try {
    const dataBranchInfoDB = await pool.query(
      "SELECT * FROM branches WHERE user_id = $1",
      [user_id]
    );
    if (dataBranchInfoDB.rows.length > 0)  {
      dataBranchInfo.id = dataBranchInfoDB.rows[0].id;
      dataBranchInfo.name = dataBranchInfoDB.rows[0].name;
      dataBranchInfo.street = dataBranchInfoDB.rows[0].street;
      dataBranchInfo.city = dataBranchInfoDB.rows[0].city;
      dataBranchInfo.postal_code = dataBranchInfoDB.rows[0].postal_code;
      dataBranchInfo.phone = dataBranchInfoDB.rows[0].phone;
      dataBranchInfo.email = dataBranchInfoDB.rows[0].email;
      dataBranchInfo.open_hours = dataBranchInfoDB.rows[0].open_hours;
    }     
    return dataBranchInfo;  
    
  } catch (err) {
    console.error("Chyba při branch RELATIONS W/ ADMIN:", err);
    throw err;
  }
}
