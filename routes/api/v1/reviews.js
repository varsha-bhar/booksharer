import express from "express";
import models from "../../../models.js";

const router = express.Router();
const NoteEntry = models.NoteEntry;
const Book = models.Book;

router.post("/", async (req, res) => {
    try {
        if (!req.session.account) {
            return res.status(401).json({
                status: "error",
                error: "not logged in"
            });
        }

        // extract data 
        const { bookId, textBody, ratingLevel } = req.body;

        // create review: 
        const createReview = new NoteEntry({
            noteByUser: req.session.account,
            textBody,
            ratingLevel,
            likes: [],
            visibleTo: [],
            dateAdded: new Date()
        });

        // save review that was created 
        await createReview.save();

        // add the new review to that specific book's review page:
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({
                status: "error",
                error: "book not found"
            });
        }
        book.noteList.push(newNote._id);
        await book.save();
        return res.json({ status: "success" });
        // end of adding the new review to that book's review page.
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            status: "error",
            error
        });
    }
});
export default router;
