import express from "express";
import {
  createAdmin,
  createUser,
  createMember,
  createBranch,
  editMember,
  adminsList,
  usersList,
  branchesList,
  membersList,
  editBranch,
  editUser,
  superadminInfo,
  adminInfo,
  organizationInfo,
  editOrganization,
  branchInfo,
  uploadOrganizationLogoMiddleware,
  uploadOrganizationLogo,
  organizationLogo,
} from "../controllers/admin.controller.js";

const router = express.Router();

router.post("/create_admin", createAdmin);

router.post("/create_user", createUser);

router.post("/create_member", createMember);

router.post("/create_branch", createBranch);

router.post("/update_member", editMember);

router.post("/update_branch", editBranch);

router.post("/update_user", editUser);

router.post("/admin_list", adminsList);

router.post("/users_list", usersList);

router.post("/branches_list", branchesList);

router.post("/members_list", membersList);

router.get("/superadminInfo", superadminInfo);

router.post("/adminInfo", adminInfo);

router.post("/organizationInfo", organizationInfo);

router.post("/update_organization", editOrganization);

router.post("/branchInfo", branchInfo);

router.post(
  "/upload_organization_logo",
  uploadOrganizationLogoMiddleware,
  uploadOrganizationLogo,
);

router.get("/organization_logo/:organizationId", organizationLogo);

export default router;
