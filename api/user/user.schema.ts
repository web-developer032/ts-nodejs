import mongoose, { Document, Model } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { resetPasswordExpireTime } from "../../constants";

export interface UserAttributes {
  contactNumber?: string;
  email: string;
  name?: string;
  ref?: UserAttributes;
  role: UserRole;
  userDetails?: Record<string, any>;
  coverPhoto?: string;
  location?: string;

  password?: string;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
}

export interface UserDocument extends UserAttributes, Document {}

export enum UserRole {
  ADMIN = "Admin",
  SUPER_ADMIN = "Super Admin",
  MODERATOR_ADMIN = "Moderator Admin",
  COUPLE = "Couple",
  GUEST = "Guest",
  VENDOR = "Vendor",
  PLANNER = "Planner",
}
interface UserModel extends Model<UserDocument> {
  checkPassword(password: string, dbPassword: string): Promise<boolean>;
  changedPassword(JWTTimeStamp: number): boolean;
  createPasswordResetToken(): string;
}

// Creating schema of Member
const userSchema = new mongoose.Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    contactNumber: { type: String },
    ref: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
    },
    userDetails: { type: Map, of: mongoose.Schema.Types.Mixed },
    coverPhoto: { type: String },
    location: { type: String },

    password: {
      type: String,
      required: [true, "Please enter your password."],
      minlength: [6, "Password must be at least 6 characters."],
      select: false,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
  },
);

userSchema.pre<UserDocument>("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(String(this.password), 12);
  }
  next();
});

userSchema.pre<UserDocument>("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = new Date(Date.now() - 5000);
  next();
});

userSchema.methods.checkPassword = async function (
  password: string,
  dbPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, dbPassword);
};

userSchema.methods.changedPassword = function (JWTTimeStamp: number): boolean {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      (this.passwordChangedAt.getTime() / 1000).toString(),
      10,
    );
    return changedTimeStamp > JWTTimeStamp;
  }
  return false; // Means password not changed.
};

userSchema.methods.createPasswordResetToken = function (): string {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = new Date(
    Date.now() + resetPasswordExpireTime * 60 * 1000,
  );
  return resetToken;
};

const User = mongoose.model<UserDocument, UserModel>("User", userSchema);

export { User };
