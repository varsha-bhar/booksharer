import express from "express";

const router = express.Router();

// return all reviews
router.get("/", async (req, res) => {
    const allReviews = await req.models.NoteEntry.find({});
    res.status(200).json(allReviews);
});

// return a specific review
router.get("/:noteId", async (req, res) => {
    const review = await req.models.NoteEntry.findOne({ _id: req.params.noteId });
    res.status(200).json(review);
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