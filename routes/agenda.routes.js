import express from "express";
import {
  searchContacts,
  updateContacts,
  deleteContacts,
  searchForServices,
  searchVatCurrent,
  searchVatAtDate,
  updateServices,
  deleteServices,
  getDashboardData,
  searchTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/agenda.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// router.post("/create_client", createClient);

router.post("/contacts-search", authenticateToken, searchContacts);

router.post("/contacts-update", authenticateToken, updateContacts);

router.post("/contacts-delete", authenticateToken, deleteContacts);

router.get("/vat/current", searchVatCurrent);

router.get("/vat", searchVatAtDate);

router.post("/services-search", authenticateToken, searchForServices);

router.post("/services-update", authenticateToken, updateServices);

router.post("/services-delete", authenticateToken, deleteServices);

router.get("/dashboard", authenticateToken, getDashboardData);

router.post("/tasks-search", authenticateToken, searchTasks);

router.post("/tasks-create", authenticateToken, createTask);

router.post("/tasks-update", authenticateToken, updateTask);

router.post("/tasks-delete", authenticateToken, deleteTask);

export default router;
