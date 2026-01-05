import express from "express";
import { searchContacts } from "../controllers/agenda.controller.js";
import { searchVatCurrent } from "../controllers/agenda.controller.js";
import { searchVatAtDate } from "../controllers/agenda.controller.js";



const router = express.Router();

// router.post("/create_client", createClient);

router.post("/contacts-search", searchContacts);

router.get("/vat/current", searchVatCurrent);

router.get("/vat", searchVatAtDate);






export default router;