import { body } from "express-validator";
import AppError from "../../utils/error.handler";

const passwordRegex =
  /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

const validateCreateUser = [
  body("email")
    .notEmpty()
    .withMessage("Email is required!")
    .isEmail()
    .withMessage("Invalid Email!")
    .trim(),

  body("name").notEmpty().withMessage("Name is required!").trim(),

  body("password")
    .notEmpty()
    .withMessage("Password is required!")
    .matches(passwordRegex)
    .withMessage(
      "Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one digit, and one special character (!@#$%^&*).",
    )
    .trim(),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirm password is required!")
    .matches(passwordRegex)
    .withMessage("Confirm password must match with the password!")
    .trim()
    .custom((value, { req }) => {
      if (value !== req.body.password)
        throw new AppError("Confirm password must match with the password!");

      return true;
    }),
];

export { validateCreateUser };
