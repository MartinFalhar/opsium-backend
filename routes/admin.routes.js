import express from "express";
import {
  createAdmin,
  createUser,
  createMember,
  createBranch,
  adminsList,
  usersList,
  branchesList,
  membersList,
  opsiumInfo,
  adminInfo,
} from "../controllers/admin.controller.js";

const router = express.Router();

router.post("/create_admin", createAdmin);

router.post("/create_user", createUser);

router.post("/create_member", createMember);

router.post("/create_branch", createBranch);

router.post("/admin_list", adminsList);

router.post("/users_list", usersList);

router.post("/branches_list", branchesList);

router.post("/members_list", membersList);

router.get("/opsiumInfo", opsiumInfo);

router.post("/adminInfo", adminInfo);

export default router;
