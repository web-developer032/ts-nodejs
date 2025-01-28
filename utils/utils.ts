import moment from "moment";
import mongoose, { isValidObjectId, LeanDocument, ObjectId } from "mongoose";
import AppError from "./error.handler";
import jwt from "jsonwebtoken";
import { logInfo } from "./logger";
import { UserRole } from "../api/user/user.schema";
import {
  dateTimeFormat,
  Days,
  HTTP_STATUS_CODES,
  StripeCurrency,
  TimeRange,
} from "../constants";

const createToken = (
  data: any,
  options: any = {
    expiresIn: "1d",
  },
) =>
  jwt.sign(
    data, // PAYLOAD
    process.env.JWT_SECRET!, // SECRET
    options,
  );

function replaceSpaceWithEmailPlus(email: string): string {
  if (email && email.includes(" ")) {
    return email.replace(/\s/g, "+").trim();
  } else {
    return email.trim();
  }
}

function extractUserNameFromEmail(email: string) {
  const atIndex = email.indexOf("@");

  const userName = email.substring(0, atIndex);

  // Split user name into first name and last name if there is a dot (".")
  const dotIndex = userName.indexOf(".");
  if (dotIndex !== -1) {
    const firstName = userName.substring(0, dotIndex);
    const lastName = userName.substring(dotIndex + 1);
    return { firstName, lastName };
  } else {
    // If no dot is found, set both firstName and lastName to the user name
    return { firstName: userName, lastName: "User" };
  }
}

//Validate email addresses
function isValidEmail(email: string): boolean {
  // Email regular expression pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidDate(dateString: string) {
  // Attempt to parse the date string with moment
  const date = moment(dateString, moment.ISO_8601, true);

  // Check if the date is valid
  return date.isValid();
}

function isValidTime(time: string) {
  return moment(time, "HH:mm").isBetween(
    moment("00:00", "HH:mm"),
    moment("23:59", "HH:mm"),
    "minutes",
    "[]",
  );
}

function validateDateFormat(date: string) {
  return moment(date, "YYYY-MM-DD", true).isValid();
}

function validateDateTimeFormat(datetime: string | Date) {
  return moment(datetime, dateTimeFormat, true).isValid();
}

function formatDate(date: string | Date) {
  return moment(date).format("MMMM Do, YYYY, h:mm A");
}

function isNumber(value: any): boolean {
  // Use parseFloat to convert string to number
  const numericValue: number = parseFloat(value);

  // Check if the parsed value is a valid number and not NaN
  return !isNaN(numericValue) && typeof numericValue === "number";
}

function isNonNegative(value: number) {
  return isNumber(value) && value >= 0;
}

function isDateBefore(dateOne: Date | string, dateTwo: Date): boolean {
  const parsedDateOne: moment.Moment = moment(dateOne);
  const parsedDateTwo: moment.Moment = moment(dateTwo);

  return (
    parsedDateOne.isValid() &&
    parsedDateTwo.isValid() &&
    parsedDateOne.isBefore(parsedDateTwo, "day")
  );
}

function isDateSame(dateOne: Date, dateTwo: Date): boolean {
  const parsedDateOne: moment.Moment = moment(dateOne);
  const parsedDateTwo: moment.Moment = moment(dateTwo);

  return (
    parsedDateOne.isValid() &&
    parsedDateTwo.isValid() &&
    parsedDateOne.isSame(parsedDateTwo, "day")
  );
}

function isDateInTheFuture(date: string | Date | moment.Moment): boolean {
  const inputDate = moment(date);

  if (!inputDate.isValid()) {
    throw new AppError("Invalid date format!");
  }

  const now = moment();
  return inputDate.isAfter(now);
}

function isValidDay(day: string): day is Days {
  return Object.values(Days).includes(day as Days);
}

function replaceAllOccurenceInString(
  str: string,
  textToSearch: string,
  textToReplace: string,
) {
  return str.replace(new RegExp(textToSearch, "g"), textToReplace);
}

const filterDataFromObject = <T, K extends keyof T>(
  object: T,
  fields: K[],
): Pick<T, K> => {
  const projectedFields = {} as Pick<T, K>;

  fields.forEach((field) => {
    projectedFields[field] = object[field];
  });

  return projectedFields;
};

const getResultFromPromiseArray = async (promiseArray: any) => {
  const results: any = await Promise.allSettled(promiseArray);

  return results.reduce((init: any, item: any) => {
    if (item.status === "fulfilled") {
      init.push(item.value);
    } else {
      init.push(null);
    }

    return init;
  }, []);
};

const stringIdToObjectId = (id: string) => new mongoose.Types.ObjectId(id);

function truncateString(str: string, len: number = 170) {
  if (str.length > len) {
    str = str.substring(0, len) + "...";
  }
  return str;
}

function checkStringMatches(str1: string, str2: string) {
  const regexString = new RegExp(str1, "i");
  return regexString.test(str2);
}

function isStringExistsInArray(stringToCheck: string, arr: any[]) {
  return arr.some((str) => checkStringMatches(stringToCheck, str));
}

function getRegexedString(string: string) {
  return new RegExp(string, "gi");
}

function generateRandomString(
  length: number,
  domain = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
) {
  return Array.from({ length }, () =>
    domain.charAt(Math.floor(Math.random() * domain.length)),
  ).join("");
}

function removeDuplicates<T>(array: T[]): T[] {
  return [...new Set(array)];
}

function isAdmin(role: UserRole) {
  return [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MODERATOR_ADMIN,
  ].includes(role);
}

function removeKeys(keys: string[], obj: any) {
  for (const field of keys) {
    delete obj[field];
  }

  return { ...obj };
}

function validateRequiredData(keys: string[], obj: any) {
  for (const id of keys) {
    if ([null, undefined].includes(obj[id])) {
      throw new AppError(`Invalid ${id}.`);
    }
  }
}

function validateIdInObject(keys: string[], obj: any) {
  for (const id of keys) {
    if (!obj[id] || !isValidObjectId(obj[id])) {
      throw new AppError(`Invalid ${id} id.`);
    }
  }
}

function removeDuplicatesByProperty<T, K extends keyof T>(
  array: T[],
  key: K,
): T[] {
  return array.filter(
    (item, index, self) =>
      index === self.findIndex((t) => t[key] === item[key]),
  );
}

function isAllowed(user: any, idToCheck: string | ObjectId) {
  let admin = isAdmin(user.role);

  if (String(idToCheck) === String(user._id) || admin) return true;

  throw new AppError(
    "You are not authorized to perform this action!",
    HTTP_STATUS_CODES.FORBIDDEN,
  );
}

function validatePassword(password: string): {
  success: boolean;
  message: string;
} {
  const passwordRegex =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

  let success = true;
  let message = "";

  if (password.length < 8) {
    message = "Password must be at least 8 characters long.";
    success = false;
  }
  if (!/[A-Z]/.test(password)) {
    message = "Password must contain at least one uppercase letter.";
    success = false;
  }
  if (!/[a-z]/.test(password)) {
    message = "Password must contain at least one lowercase letter.";
    success = false;
  }
  if (!/\d/.test(password)) {
    message = "Password must contain at least one digit.";
    success = false;
  }
  if (!/[!@#$%^&*]/.test(password)) {
    message =
      "Password must contain at least one special character (!@#$%^&*).";
    success = false;
  }
  if (!passwordRegex.test(password)) {
    message = "Password does not meet the complexity requirements.";
    success = false;
  }

  return {
    success,
    message,
  };
}

function generateRandomPassword(): string {
  const specialChars = "!@#$%^&*()_+~`|}{[]\\:;?><,./-=";
  const numChars = "0123456789";
  const upperChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowerChars = "abcdefghijklmnopqrstuvwxyz";
  const allChars = upperChars + lowerChars + specialChars + numChars;

  let password = "";
  let hasNumber = false;
  let hasSpecial = false;
  let hasLower = false;
  let hasUpper = false;

  while (
    password.length < 8 ||
    !hasNumber ||
    !hasSpecial ||
    !hasLower ||
    !hasUpper
  ) {
    const nextChar = allChars.charAt(
      Math.floor(Math.random() * allChars.length),
    );
    password += nextChar;

    if (numChars.includes(nextChar)) {
      hasNumber = true;
    } else if (specialChars.includes(nextChar)) {
      hasSpecial = true;
    } else if (upperChars.includes(nextChar)) {
      hasUpper = true;
    } else if (lowerChars.includes(nextChar)) {
      hasLower = true;
    }
  }

  return password;
}

export {
  createToken,
  validatePassword,
  // --------------------
  replaceSpaceWithEmailPlus,
  isValidEmail,
  // --------------------
  isValidDate,
  isDateBefore,
  isDateSame,
  isDateInTheFuture,
  isValidDay,
  isValidTime,
  validateDateFormat,
  formatDate,
  validateDateTimeFormat,
  // --------------------
  isNumber,
  isNonNegative,
  replaceAllOccurenceInString,
  filterDataFromObject,
  getResultFromPromiseArray,
  stringIdToObjectId,
  truncateString,
  extractUserNameFromEmail,
  isStringExistsInArray,
  checkStringMatches,
  getRegexedString,
  generateRandomString,
  removeDuplicates,
  removeDuplicatesByProperty,
  removeKeys,
  validateIdInObject,
  validateRequiredData,
  generateRandomPassword,
  isAdmin,
  isAllowed,
};
