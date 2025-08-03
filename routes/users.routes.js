import express from "express";
import {
  loginPage,
  loginUser,
  indexPage,
  registerUser,
} from "../controllers/users.controller.js";

const router = express.Router();

router.get("/", loginPage);

router.get("/index", indexPage);

router.post("/login", loginUser);

router.post("/register", registerUser);

export default router;
