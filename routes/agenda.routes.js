import express from "express";
import {
  searchContacts,
  searchForServices,
  searchVatCurrent,
  searchVatAtDate,
  updateServices,
  deleteServices,
} from "../controllers/agenda.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// router.post("/create_client", createClient);

router.post("/contacts-search", authenticateToken, searchContacts);

router.get("/vat/current", searchVatCurrent);

router.get("/vat", searchVatAtDate);

router.post("/services-search", authenticateToken, searchForServices);

router.post("/services-update", authenticateToken, updateServices);

router.post("/services-delete", authenticateToken, deleteServices);

export default router;
