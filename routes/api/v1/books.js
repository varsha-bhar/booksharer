import express from "express";
import models from "../../../models.js";

const router = express.Router();
const Book = models.Book;

router.post("/", async (req, res) => {
    try {
        if (!req.session.account) {
            return res.status(401).json({
                status: "error",
                error: "not logged in"
            });
        }

        // extracts data (based on the schema in models.js)
        const {
            ISBN,
            title,
            authorFirstName,
            authorMiddleName,
            authorLastName,
            year,
            publisher,
            edition
        } = req.body;

        // creates the new book 
        const newBook = new Book({
            ISBN,
            title,
            authorFirstName,
            authorMiddleName,
            authorLastName,
            year,
            publisher,
            edition,
            noteList: [],
            addedByUser: req.session.account,
        });

        // saves the new book so that users can review it 
        await newBook.save();

        return res.json({
            status: "success",
            bookId: newBook._id
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            status: "error",
            error
        });
    }
});

export default router;
