import { searchInStoreFromDB } from "../models/store.model.js";
import { updateIteminDB } from "../models/store.model.js";
import { newOrderInsertToDB } from "../models/store.model.js";
import { newTransactionInsertToDB } from "../models/store.model.js";
import { ordersListFromDB } from "../models/store.model.js";
import { getContactsListFromDB } from "../models/store.model.js";
import { putInStoreDB } from "../models/store.model.js";
import { putInMultipleStoreDB } from "../models/store.model.js";

export async function searchInStore(req, res) {
  // id_branch bereme z JWT tokenu
  const id_branch = req.user.id_branch;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const query = req.query.value || "";
  const store = req.query.store ;
 
  console.log("Controller - searchInStore called with:", {
    store,
    query,
  });
  try {
    const result = await searchInStoreFromDB(
      store,
      query,
      id_branch,
      limit,
      offset,
      page,
    );
    if (result) {
      res.json(result);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při nahrávání položek ze skladu." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}

export async function searchInContacts(req, res) {
  // id_branch bereme z JWT tokenu
  const id_organization = req.user.id_organization;
  const query = req.query.field || "";
  try {
    const result = await getContactsListFromDB(id_organization, query);
    if (result) {
      res.json(result);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při vytváření seznamu z kontaktů." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}

export async function putInStore(req, res) {
  // id_branch bereme z JWT tokenu
  const id_branch = req.user.id_branch;
  const plu = req.body.plu;
  const id_supplier = req.body.id_supplier;
  const delivery_note = req.body.delivery_note;
  const quantity = req.body.quantity;
  const price_buy = req.body.price_buy;
  const date = req.body.date;

  console.log("Controller - putInStore called with:", {
    id_branch,
    plu,
    id_supplier,
    delivery_note,
    quantity,
    price_buy,
    date,
  });

  try {
    const result = await putInStoreDB(
      store,
      id_branch,
      plu,
      id_supplier,
      delivery_note,
      quantity,
      price_buy,
      date,
    );
    if (result) {
      res.json(result);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při nahrávání položek ze skladu." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}

export async function putInMultipleStore(req, res) {
  // id_branch bereme z JWT tokenu
  const id_branch = req.user.id_branch;
  const id_organization = req.user.id_organization;
  const items = req.body.items;
  const id_warehouse = req.body.storeId;

  try {
    const result = await putInMultipleStoreDB(
      id_branch,
      id_organization,
      items,
      id_warehouse,
    );
    if (result) {
      res.json(result);
    } else {
      res.json({ message: "Selhání při hromadném naskladnění položek." });
    }
  } catch (error) {
    console.error("Error in putInMultipleStore:", error);
    res.json({ success: false, message: error.message || "Chyba serveru" });
  }
}

export async function updateInStore(req, res) {
  // id_branch bereme z JWT tokenu
  const id_branch = req.user.id_branch;

  const id_organization = req.user.id_organization;
  const table = req.body.storeId;
  const updatedItem = req.body.values;

  try {
    const result = await updateIteminDB(
      updatedItem,
      table,
      id_branch,
      id_organization,
    );
    if (result) {
      res.json(result);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při nahrávání položek ze skladu." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}

export async function newOrder(req, res) {
  try {
    // Přidáme id_branch z JWT tokenu
    const result = await newOrderInsertToDB({
      ...req.body,
      id_branch: req.user.id_branches,
    });
    if (result) {
      res.json(result);
    } else {
      res.json({ message: "Selhání při nahrávání položek ze skladu." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}

export async function newTransaction(req, res) {
  try {
    const result = await newTransactionInsertToDB(req.body);
    if (result) {
      res.json(result);
    } else {
      res.json({ message: "Selhání při nahrávání nové transakce." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}

export async function ordersList(req, res) {
  try {
    // id_branch bereme z JWT tokenu
    const orders = await ordersListFromDB(req.user.id_branch);
    if (orders && orders.length > 0) {
      res.json(orders);
    } else {
      res.json({ message: "Selhání při nahrávání zakázek" });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}
