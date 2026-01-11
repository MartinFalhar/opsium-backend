import express from "express";
import {
  searchContacts,
  searchForServices,
  searchVatCurrent,
  searchVatAtDate,
  updateServices,
  deleteServices,
} from "../controllers/agenda.controller.js";

const router = express.Router();

// router.post("/create_client", createClient);

router.post("/contacts-search", searchContacts);

router.get("/vat/current", searchVatCurrent);

router.get("/vat", searchVatAtDate);

router.post("/services-search", searchForServices);

router.post("/services-update", updateServices);

router.post("/services-delete", deleteServices);

export default router;
