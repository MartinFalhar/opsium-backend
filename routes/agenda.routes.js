import express from "express";
import {
  searchContacts,
  searchForServices,
  searchVatCurrent,
  searchVatAtDate,
} from "../controllers/agenda.controller.js";

const router = express.Router();

// router.post("/create_client", createClient);

router.post("/contacts-search", searchContacts);

router.get("/vat/current", searchVatCurrent);

router.get("/vat", searchVatAtDate);

router.post("/services-search", searchForServices);

export default router;
