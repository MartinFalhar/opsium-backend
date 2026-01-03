import express from "express";
import { searchContacts } from "../controllers/agenda.controller.js";


const router = express.Router();

// router.post("/create_client", createClient);

router.post("/contacts-search", searchContacts);




export default router;