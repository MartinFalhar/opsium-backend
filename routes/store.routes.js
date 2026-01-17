import express from "express";
import { searchInStore } from "../controllers/store.controller.js";
import { newOrder } from "../controllers/store.controller.js";
import { ordersList } from "../controllers/store.controller.js";
import { newTransaction } from "../controllers/store.controller.js";

const router = express.Router();

// router.post("/create_client", createClient);

router.post("/search", searchInStore);

router.post("/new-order", newOrder);

router.post("/new-transaction", newTransaction);

router.post("/orders-list", ordersList);

export default router;
