import express from "express";
import models from "../../../models.js";

const router = express.Router();
const NoteEntry = models.NoteEntry;
const Book = models.Book;


// ADD REVIEWS FUNCTIONALITY 
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
        book.noteList.push(createReview._id); 
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




// SEARCH THROUGH REVIEWS FUNCTIONALITY
router.get("/search", async (req, res) => {
    try {
        const { keyword } = req.query;

        if (!keyword) {
            return res.json({ status: "success", results: [] });
        }
        const allReviews = await NoteEntry.find().populate("noteByUser", "username");   // all reviews from DB

        const lowerKey = keyword.toLowerCase();  // lowercase to standardize the search in the DB
        
        // search feature can filter by the review's text, username, or rating 
        const results = allReviews.filter(review => { 

            if (review.textBody && review.textBody.toLowerCase().includes(lowerKey)) {
                return true;
            }

            if (review.noteByUser && review.noteByUser.username.toLowerCase().includes(lowerKey)) {
                return true;
            }

            if (String(review.ratingLevel) === keyword) {
                return true;
            }

            return false;
        });

        return res.json({
            status: "success",
            results
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: "error", error });
    }
});

export default router;