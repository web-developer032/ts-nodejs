import helmet from "helmet";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import colors from "colors";
import cookieParser from "cookie-parser";
import path from "path";

// ---------------------------
// ROUTES
// ---------------------------
import userRoutes from "./api/user";

// ---------------------------
// MIDDLEWARES
// ---------------------------
import apiLimiter from "./middleware/apiLimiter";
import { errorHandler } from "./utils/error.handler";

colors.enable();

const app = express();

const corsOptions = {
  origin: true, // Allow any origin
  credentials: true, // Enable cookies and other credentials
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(helmet());
app.use(compression());
app.use(mongoSanitize()); // IT PREVENT ATTACKS LIKE: { email: {$gt: ""}, password: pass1228}

app.use(cookieParser()); // TO READ COOKIES SENT FROM CLIENT

// Define a custom token for human-readable date
morgan.token("custom-date", () => {
  const now = new Date();
  return now.toLocaleString("en-US", { timeZone: "UTC" });
});

// Use the custom token in the log format
app.use(
  morgan(
    `${process.env.NODE_ENV} -> :custom-date :status :method :url :res[content-length] - :response-time ms`,
  ),
);

app.use("/public", express.static(path.join(__dirname, "public")));

// app.use(express.static(`${__dirname}/public`)); // to access files from the server. (STATIC FILES)

app.use(express.json({ limit: "20mb" })); // Increase to 5MB or as needed
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use("/api/", apiLimiter);

app.get("/api/test", (req, res) => res.send("API is running..."));
app.use("/api/users", userRoutes);

// app.get("*", (req, res) => {
//   res.sendFile(path.resolve("../../client/build", "index.html"));
// });

app.use(errorHandler);

export { app };
