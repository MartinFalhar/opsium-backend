import { searchInStoreFromDB } from "../models/store.model.js";
import { newOrderInsertToDB } from "../models/store.model.js";
import { newTransactionInsertToDB } from "../models/store.model.js";
import { ordersListFromDB } from "../models/store.model.js";

export async function searchInStore(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const query = req.query.value || "";
  const table = req.query.store === "1" ? "store_frames" : "store_lens";

  // id_branch bereme z JWT tokenu
  const id_branch = req.user.id_branch;

  try {
    const result = await searchInStoreFromDB(
      table,
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
