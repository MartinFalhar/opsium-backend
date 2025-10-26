import express from "express";
import {
  loginPage,
  loginUser,
  // heroImgInfo,
  // heroImg,
  indexPage,
  createUser,
  createAdmin,
  createClient,
  createBranch,
  adminsList,
  usersList,
  // saveOptotyp,
  // loadOptotyp,
  loadClients,
} from "../controllers/users.controller.js";

const router = express.Router();

router.get("/", loginPage);

router.get("/index", indexPage);

// router.get("/hero_img/:id", heroImg);

router.post("/login", loginUser);

// router.post("/hero_img_info", heroImgInfo);

router.post("/create_user", createUser);

router.post("/create_admin", createAdmin);

router.post("/create_client", createClient);

router.post("/create_branch", createBranch);

router.post("/admin_list", adminsList);

router.post("/users_list", usersList);

// router.post("/saveoptotyp", saveOptotyp);

// router.post("/loadoptotyp", loadOptotyp);

router.post("/clients", loadClients);

export default router;
