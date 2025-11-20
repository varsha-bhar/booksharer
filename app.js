import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';

import models from './models.js'
import usersRouter from './routes/users.js';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import reviewRoutes from "./routes/api/v1/reviews.js";
import booksRoutes from "./routes/api/v1/books.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    req.models = models
    next()
});

app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/books", booksRoutes);


app.use('/users', usersRouter);

app.listen(3000, () => {
    console.log("Example app listening at http://localhost:3000")
})

export default app;
