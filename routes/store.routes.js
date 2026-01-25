import express from "express";
import { searchInStore } from "../controllers/store.controller.js";
import { searchInContacts } from "../controllers/store.controller.js";
import { updateInStore } from "../controllers/store.controller.js";
import { newOrder } from "../controllers/store.controller.js";
import { ordersList } from "../controllers/store.controller.js";
import { newTransaction } from "../controllers/store.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { putInStore } from "../controllers/store.controller.js";
import { putInMultipleStore } from "../controllers/store.controller.js";
import { getLensInfo } from "../controllers/store.controller.js";

const router = express.Router();

// router.post("/create_client", createClient);

router.get("/search", authenticateToken, searchInStore);

router.get("/suppliers-list", authenticateToken, searchInContacts);

router.post("/update", authenticateToken, updateInStore);

router.post("/putin-stock", authenticateToken, putInStore);

router.post("/putin-multiple", authenticateToken, putInMultipleStore);

router.post("/new-order", authenticateToken, newOrder);

router.post("/new-transaction", authenticateToken, newTransaction);

router.post("/orders-list", authenticateToken, ordersList);

router.post("/getlens", authenticateToken, getLensInfo);

export default router;
