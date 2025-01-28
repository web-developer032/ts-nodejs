import { NextFunction, Response } from "express";
import crypto from "crypto";

import asyncHandler from "../../utils/async.handler";
import AppError from "../../utils/error.handler";
import { HTTP_STATUS_CODES } from "../../constants";
import ResponseHandler from "../../utils/response.handler";

import { User, UserDocument, UserRole } from "./user.schema";
import { createToken, validatePassword } from "../../utils/utils";
import { logInfo } from "../../utils/logger";
import { getUserFromToken } from "../../middleware/authentication";

const createAndSendToken = (
  res: any,
  user: any,
  message = "Successfull.",
  statusCode = HTTP_STATUS_CODES.OK,
) => {
  const token = createToken({ id: user._id, role: user.role });

  user.password = undefined;

  return ResponseHandler.sendSuccess(res, message, { token, user }, statusCode);
};

const register = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    let { name, email, contactNumber, password, userDetails } = req.body;

    email = email.toLowerCase();

    // Check if user with email already exists
    let user = await User.findOne({ email });
    if (!user) {
      throw new AppError(
        `User already exists with the email ${email}`,
        HTTP_STATUS_CODES.CONFLICT,
      );
    }

    user = await User.create({
      name,
      email,
      contactNumber,
      password,
      userDetails,
    });

    return createAndSendToken(
      res,
      user,
      "Successfully created account.",
      HTTP_STATUS_CODES.CREATED,
    );
  },
);

const login = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    // 1) CHECK IF EMAIL AND PASSWORD EXISTS
    if (!email || !password)
      throw new AppError("Email and Password is required!");

    // 2) CHECK IF USER EXISTS AND PASSWORD IS CORRECT
    const user = (await User.findOne({ email }).select(
      "+password",
    )) as UserDocument & {
      checkPassword: (password: string, dbPassword: string) => Promise<boolean>;
    };
    if (!user) throw new AppError("Email or Password is wrong!");

    const userChecked = await user?.checkPassword(password, user.password!);
    if (!userChecked) throw new AppError("Email or Password is wrong!");

    // 3) CHECK IF EXERYTHING IS CORRECT, SEND THE TOKEN
    return createAndSendToken(res, user, "Successfully loggedIn.");
  },
);

const logout = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    res.clearCookie("jwt");
    res.cookie("jwt", " ", {
      maxAge: 1,
    });

    return ResponseHandler.sendSuccess(res, "Successfully logged out.");
  },
);

const updatePassword = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    // 1) GET USER FROM COLLECTION
    const user = (await User.findById(req.user._id).select(
      "+password",
    )) as UserDocument & {
      checkPassword: (password: string, dbPassword: string) => Promise<boolean>;
    };

    let { currentPassword, newPassword, confirmPassword } = req.body;

    if (!newPassword?.trim() || !currentPassword?.trim())
      throw new AppError("New Password & Confirm Password is required!");

    // 2) CHECK IF ENTERED PASSWORD IS CORRECT
    const userChecked = await user?.checkPassword(
      currentPassword,
      user.password!,
    );

    let validPassword = validatePassword(newPassword);
    if (!validPassword.success) throw new AppError(validPassword.message);

    if (newPassword !== confirmPassword)
      throw new AppError("Password doesn't match with confirm password!");

    // 3) UPDATE THE PASSWORD
    if (userChecked) {
      user.password = newPassword;
    } else throw new AppError("Wrong password!");

    // 4) LOG IN THE USER AND SEND JWT TOKEN
    await user.save();

    return createAndSendToken(res, user, "Successfully updated password.");
  },
);

const forgotPassword = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const user = (await User.findOne({
      email: req.body.email,
    })) as UserDocument & { createPasswordResetToken: () => string };
    if (!user)
      throw new AppError("User not found.", HTTP_STATUS_CODES.NOT_FOUND);

    // 2) GENERATE RANDOM TOKEN
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      // 3) SEND THAT TOKEN TO PROVIDED EMAIL
      const resetURL = `${req.protocol}://${req.get(
        "host",
      )}/api/v1/users/resetPassword/${resetToken}`;

      logInfo("resetURL: ", resetURL);

      return ResponseHandler.sendSuccess(
        res,
        "Successfully sent password reset token.",
      );
    } catch (error) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;

      await user.save({ validateBeforeSave: false });

      throw new AppError(
        "There was an error in sending the email! Try Again.",
        500,
      );
    }
  },
);

const resetPassword = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    if (!req.params.token?.trim()) throw new AppError("Invalid reset token!");

    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    // 2) IF TOKEN HAS NOT EXPIRED AND THERE IS A USER, SET THE NEW PASSWORD
    if (!user) throw new AppError("Token has been expired or invalid token!");

    // 3) VALIDATE PASSWORD
    let { password, confirmPassword } = req.body;

    if (!password.trim() || !confirmPassword.trim())
      throw new AppError("Password & Confirm Password is required!");

    let validPassword = validatePassword(password);
    if (!validPassword.success) throw new AppError(validPassword.message);

    if (password !== confirmPassword)
      throw new AppError("Password doesn't match with confirm password!");

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    // 4) changedPasswordAt PROPERTY is updating in the user middleware

    // 5) LOG USER IN & SEND JWT TOKEN
    await user.save();

    return createAndSendToken(res, user, "Successfully reset password.");
  },
);

const loginByToken = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    let user = await getUserFromToken(req);

    if (!user) throw new AppError("Invalid or expire token!");

    ResponseHandler.sendSuccess(res, "Successfully loggedIn.", user);
  },
);

const getUserById = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user)
      throw new AppError("User not found!", HTTP_STATUS_CODES.NOT_FOUND);

    return ResponseHandler.sendSuccess(res, "Successfully fetched user.", user);
  },
);

const updateUser = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const { name, userDetails } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        name,
        userDetails,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!user)
      throw new AppError("User not found!", HTTP_STATUS_CODES.NOT_FOUND);

    return ResponseHandler.sendSuccess(res, "Successfully updated user.", user);
  },
);

const getMultipassToken = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const user = req.user.id;

    const hash = crypto
      .createHash("md5")
      .update(process.env.MULTIPASS_KEY!)
      .digest("hex");

    // Convert hash slices to Buffer
    const _encryptionKey = Buffer.from(hash.slice(0, 16), "hex");
    const _signingKey = Buffer.from(hash.slice(16, 32), "hex");

    const calculateHmac = (data: Buffer, key: Buffer) => {
      return crypto.createHmac("sha256", key).update(data).digest();
    };

    const encryptToken = (key: Buffer, data: string, iv: Buffer) => {
      const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
      return Buffer.concat([iv, cipher.update(data, "utf8"), cipher.final()]);
    };

    const dummyUser = {
      email: user.email,
      first_name: "Dulasha",
      last_name: "Devani",
      return_to: "https://www.google.com/",
    };

    const iv = crypto.randomBytes(16);
    // Convert the result of encryptToken to Buffer
    const verUser = encryptToken(_encryptionKey, JSON.stringify(dummyUser), iv);

    // Calculate HMAC on Buffer
    const verHmac = calculateHmac(verUser, _signingKey);

    let token = Buffer.concat([verUser, verHmac]).toString("base64");
    token = token.replace(/\\+/g, "-");
    return `https://www.ejuno.io/en/ms/login/multipass/${token}`;
  },
);

const getUsers = asyncHandler(async (req: any, res: Response) => {
  const { type } = req.query;

  if (![UserRole.PLANNER, UserRole.VENDOR].includes(type))
    throw new AppError("Invalid type!");

  const users = await User.find({ role: type });

  return ResponseHandler.sendSuccess(res, "Successfully fetched users.", users);
});

export default {
  getUserById,
  getUsers,
  updateUser,
  getMultipassToken,

  register,

  login,
  loginByToken,
  logout,

  resetPassword,
  forgotPassword,
  updatePassword,
};
