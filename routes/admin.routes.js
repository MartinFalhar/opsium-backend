import express from "express";
import {
  createUser,
  createAdmin,
  createBranch,
  adminsList,
  usersList,
} from "../controllers/admin.controller.js";

const router = express.Router();

router.post("/create_user", createUser);

router.post("/create_admin", createAdmin);

router.post("/create_branch", createBranch);

router.post("/admin_list", adminsList);

router.post("/users_list", usersList);

export default router;
