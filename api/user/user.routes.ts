import express from "express";
import userHandlers from "./user.handlers";
import isAuthenticated from "../../middleware/authentication";
import { validateRequest } from "../../middleware/validate-request";
import {
  validateIsObjectId,
  validateParamUserId,
} from "../../middleware/validate-params";
import { uploadAndValidateMemberProfileImage } from "./user.middlewares";
import { validateCreateUser } from "./user.validations";

const userRoutes = express.Router();

// ------------------------
// * MAKE NEXT ROUTE PROTECTED
// ------------------------

userRoutes
  .route("/")
  .get(userHandlers.getUsers)
  .patch(isAuthenticated, userHandlers.updateUser)
  .post(validateCreateUser, validateRequest, userHandlers.register);

userRoutes
  .route("/:userId")
  .all(isAuthenticated, validateIsObjectId("userId"))
  .get(userHandlers.getUserById);
// .patch(
//   validateIsObjectId("userId"),
//   uploadAndValidateMemberProfileImage,
//   validateRequest,
//   userHandlers.updateMember,
// );

userRoutes.post("/login", userHandlers.login);
userRoutes.get("/loginByToken", userHandlers.loginByToken);
userRoutes.get("/logout", userHandlers.logout);

userRoutes.post("/forgotPassword", userHandlers.forgotPassword);
userRoutes.post("/resetPassword/:token", userHandlers.resetPassword);

userRoutes.use(isAuthenticated);
userRoutes.post("/updatePassword", userHandlers.updatePassword);

export default userRoutes;
