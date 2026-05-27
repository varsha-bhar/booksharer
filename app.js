import express from 'express';
import path, { dirname } from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import sessions from 'express-session';
import WebAppAuthProvider from 'msal-node-wrapper';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import reviewRoutes from "./routes/api/v1/reviews.js";
import booksRoutes from "./routes/api/v1/books.js";
import usersRouter from './routes/api/v1/users.js';
import friendsRoutes from "./routes/api/v1/friends.js";

dotenv.config();

const { default: models } = await import("./models.js");
const requiredEnvVars = [
    "CLIENT_ID",
    "AUTHORITY",
    "CLIENT_SECRET",
    "REDIRECT_URI",
    "SESSION_SECRET",
    "MONGODB_URI"
];

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(", ")}`);
}

const authConfig = {
    auth: {
        clientId: process.env.CLIENT_ID,
        authority: process.env.AUTHORITY,
        clientSecret: process.env.CLIENT_SECRET,
        redirectUri: process.env.REDIRECT_URI
    },
    system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
                console.log(message);
            },
            piiLoggingEnabled: false,
            logLevel: 3,
        }
    }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

var app = express();

app.enable('trust proxy')
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const oneDay = 1000 * 60 * 60 * 24;
app.use(
    sessions({
        secret: process.env.SESSION_SECRET,
        saveUninitialized: true,
        cookie: {
            maxAge: oneDay,
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production"
        },
        resave: false
    })
);

const authProvider = await WebAppAuthProvider.WebAppAuthProvider.initialize(authConfig);
app.use(authProvider.authenticate());

// Pretty URL for book pages
app.get("/book/:id", (req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "book.html"));
});

app.get("/healthz", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.use((req, res, next) => {
    req.models = models;
    next();
});


app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/books", booksRoutes);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/friends", friendsRoutes);



app.get("/signin", (req, res, next) => {
  return req.authContext.login({
    postLoginRedirectUri: "/", // after successful login
  })(req, res, next);
});

app.get("/signout", (req, res, next) => {
  return req.authContext.logout({
    postLogoutRedirectUri: "/", // after logout
  })(req, res, next);
});

// MSAL error handler
app.use(authProvider.interactionErrorHandler());

export default app;
