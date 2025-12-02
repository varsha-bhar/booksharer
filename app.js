import express from 'express';
import path, { dirname } from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import sessions from 'express-session';
import WebAppAuthProvider from 'msal-node-wrapper';
import dotenv from 'dotenv';

import models from './models.js'

import { fileURLToPath } from 'url';
import reviewRoutes from "./routes/api/v1/reviews.js";
import booksRoutes from "./routes/api/v1/books.js";
import usersRouter from './routes/api/v1/users.js';

dotenv.config();
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
        cookie: { maxAge: oneDay },
        resave: false
    })
);

const authProvider = await WebAppAuthProvider.WebAppAuthProvider.initialize(authConfig);
app.use(authProvider.authenticate());

// Pretty URL for book pages
app.get("/book/:id", (req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "book.html"));
});

app.use((req, res, next) => {
    req.models = models;
    next();
});

app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/books", booksRoutes);
app.use("/api/v1/users", usersRouter);

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
