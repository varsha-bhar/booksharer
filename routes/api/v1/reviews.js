import express from "express";
var router = express.Router();
import mongoose from "mongoose";

// GET REVIEWS FOR A BOOK - GET /api/v1/reviews?bookID=123
router.get("/", async (req, res) => {
  try {
    const { bookID } = req.query;

    if (!bookID) {
      return res.status(400).json({
        status: "error",
        error: "missing bookID parameter",
      });
    }

    const book = await req.models.Book.findById(bookID).populate({
      path: "noteList",
      populate: { path: "noteByUser", select: "username" },
    });

    if (!book) {
      return res.status(404).json({
        status: "error",
        error: "book not found",
      });
    }

    return res.json(book.noteList || []);
  }
  catch (err) {
    console.log("GET /reviews error:", err);
    return res.status(500).json({
      status: "error",
      error: err.message ?? String(err),
    });
  }
});

// ADD REVIEW- POST /api/v1/reviews
router.post("/", async (req, res) => {
  try {
    // must be logged in (same pattern as comments.js)
    if (!req.session?.isAuthenticated) {
      return res.status(401).json({ status: "error", error: "not logged in" });
    }

    const { bookID, textBody, ratingLevel } = req.body || {};
    const NoteEntry = req.models.NoteEntry;
    const User = req.models.User;
    const Book = req.models.Book;

    // basic validation
    if (!bookID) {
      return res
        .status(400)
        .json({ status: "error", error: "missing bookID" });
    }

    if (!textBody && (ratingLevel === null || ratingLevel === undefined)) {
      return res.status(400).json({
        status: "error",
        error: "must provide textBody or ratingLevel",
      });
    }

    // look up the logged-in user from the session (msal-node-wrapper)
    const username = req.session.account.username;
    const displayName = req.session.account.name || username;

    // find or create the User document
    let user = await User.findOne({ username });
    if (!user) {
      user = new User({
        username,
        displayName,
        readList: [],
        tagList: [],
        friendLists: [],
      });
      await user.save();
    }

    // create the review document
    const newReview = new NoteEntry({
      noteByUser: user._id,
      textBody,
      ratingLevel,
      likes: [],
      visibleTo: [],
      dateAdded: new Date(),
    });

    await newReview.save();

    // attach review to the book
    const book = await Book.findById(bookID);
    if (!book) {
      return res
        .status(404)
        .json({ status: "error", error: "book not found" });
    }

    book.noteList.push(newReview._id);
    await book.save();

    return res.json({ status: "success" });
  }
  catch (err) {
    console.log("POST /api/v1/reviews error:", err);
    return res.status(500).json({
      status: "error",
      error: err?.message ?? String(err),
    });
  }
});

// return a specific review
router.get("/:reviewId", async (req, res) => {
    const review = await req.models.NoteEntry.findOne({ _id: req.params.reviewId });
    res.status(200).json(review);
});


// DELETE REVIEW - DELETE /api/v1/reviews
router.delete("/:reviewId", async (req, res) => {
  try {
    // must be logged in (same pattern as comments.js)
    if (!req.session?.isAuthenticated) {
      return res.status(401).json({ status: "error", error: "not logged in" });
    }

    const { reviewId } = req.params;
    const username = req.session.account.username;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ status: "error", error: "invalid id" });
    }

    // 1. Load the review
    const review = await req.models.NoteEntry.findById(reviewId).populate("noteByUser");
    if (!review) {
      return res.status(404).json({ status: "error", error: "review not found" });
    }

    // 2. Only allow user to delete own review
    if (!review.noteByUser || review.noteByUser.username !== username) {
      return res.status(403).json({ status: "error", error: "not your review" });
    }

    // 3. Find the book containing this review
    const book = await req.models.Book.findOne({ noteList: reviewId });
    if (book) {
      await req.models.Book.updateOne(
        { _id: book._id },
        { $pull: { noteList: reviewId } }
      );
    }

    // 4. Delete the review
    await review.deleteOne();

    return res.json({ status: "success" });

  } catch (err) {
    console.error("DELETE /api/v1/reviews/:reviewId error:", err);
    return res.status(500).json({
      status: "error",
      error: "Internal server error while deleting review",
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
