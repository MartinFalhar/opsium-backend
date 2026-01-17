import express from "express";
import { searchInStore } from "../controllers/store.controller.js";
import { newOrder } from "../controllers/store.controller.js";
import { ordersList } from "../controllers/store.controller.js";
import { newTransaction } from "../controllers/store.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// router.post("/create_client", createClient);

router.get("/search", authenticateToken, searchInStore);

router.post("/new-order", authenticateToken, newOrder);

router.post("/new-transaction", authenticateToken, newTransaction);

router.post("/orders-list", authenticateToken, ordersList);

export default router; 
