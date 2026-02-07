import { searchInStoreFromDB } from "../models/store.model.js";
import { updateIteminDB } from "../models/store.model.js";
import { newOrderInsertToDB } from "../models/store.model.js";
import { newTransactionInsertToDB } from "../models/store.model.js";
import { ordersListFromDB } from "../models/store.model.js";
import { getContactsListFromDB } from "../models/store.model.js";
import { putInStoreDB } from "../models/store.model.js";
import { putInMultipleStoreDB } from "../models/store.model.js";
import { getCatalogInfoFromDB } from "../models/store.model.js";
import { getVatListFromDB } from "../models/store.model.js";

export async function searchInStore(req, res) {
  // branch_id bereme z JWT tokenu
  const branch_id = req.user.branch_id;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const query = req.query.value || "";
  const store = req.query.store;

  try {
    const result = await searchInStoreFromDB(
      store,
      query,
      branch_id,
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
  // branch_id bereme z JWT tokenu
  const organization_id = req.user.organization_id;
  const query = req.query.field || "";
  try {
    const result = await getContactsListFromDB(organization_id, query);
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
  // branch_id bereme z JWT tokenu
  const branch_id = req.user.branch_id;
  const store = req.body.store;
  const plu = req.body.plu;
  const supplier_id = req.body.supplier_id;
  const delivery_note = req.body.delivery_note;
  const quantity = req.body.quantity;
  const price_buy = req.body.price_buy;
  const date = req.body.date;

  try {
    const result = await putInStoreDB(
      store,
      branch_id,
      plu,
      supplier_id,
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
  // branch_id bereme z JWT tokenu
  const branch_id = req.user.branch_id;
  const organization_id = req.user.organization_id;
  const items = req.body.items;
  const store_id = req.body.storeId;

  // console.log("Controller - putInMultipleStore called with:", {
  //   branch_id,
  //   organization_id,
  //   storeId_from_body: req.body.storeId,
  //   store_id,
  //   items_keys: items ? Object.keys(items).slice(0, 5) : "no items",
  // });

  try {
    const result = await putInMultipleStoreDB(
      branch_id,
      organization_id,
      items,
      store_id,
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
  // branch_id bereme z JWT tokenu
  const branch_id = req.user.branch_id;

  const organization_id = req.user.organization_id;
  const table = req.body.storeId;
  const updatedItem = req.body.values;

  try {
    const result = await updateIteminDB(
      updatedItem,
      table,
      branch_id,
      organization_id,
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
    // Přidáme branch_id z JWT tokenu
    const result = await newOrderInsertToDB({
      ...req.body,
      branch_id: req.user.branch_id,
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
    // branch_id bereme z JWT tokenu
    const orders = await ordersListFromDB(req.user.branch_id);
    if (orders && orders.length > 0) {
      res.json(orders);
    } else {
      res.json({ message: "Selhání při nahrávání zakázek" });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}

export async function getCatalogInfo(req, res) {
  const { plu, catalogType } = req.body;
  try {
    const catalogInfo = await getCatalogInfoFromDB(plu, catalogType);
    if (catalogInfo) {
      res.json({ success: true, data: catalogInfo });
    } else {
      res.status(404).json({
        success: false,
        message: "Položka s tímto PLU nebyla nalezena v katalogu",
      });
    }
  } catch (error) {
    console.error("Controller - getCatalogInfo error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Chyba serveru při načítání informací z katalogu",
      });
  }
}

export async function getVatList(req, res) {
  try {
    const result = await getVatListFromDB();
    if (result) {
      res.json(result);
    } else {
      res.json({ message: "Selhání při načítání sazeb DPH." });
    }
  } catch (error) {
    console.error("Controller - getVatList error:", error);
    res.status(500).json({ success: false, message: "Chyba serveru" });
  }
}
