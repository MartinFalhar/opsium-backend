import express from "express";
import { searchInStore } from "../controllers/store.controller.js";
import { newInvoice } from "../controllers/store.controller.js";
import { invoicesList } from "../controllers/store.controller.js";
import { newTransaction } from "../controllers/store.controller.js";

const router = express.Router();

// router.post("/create_client", createClient);

router.post("/search", searchInStore);

router.post("/new-invoice", newInvoice);

router.post("/new-transaction", newTransaction);

router.post("/invoices-list", invoicesList);


export default router;