import express from 'express';
var router = express.Router();

/** Helper: must be logged in */
function requireLogin(req, res, next) {
  if (!req.session?.isAuthenticated || !req.session.account) {
    return res.status(401).json({ status: "error", error: "not logged in" });
  }
  next();
}

router.get("/", async (req, res) => {
    const users = await req.models.User.find({});
    res.status(200).json(users);
});

router.get("/:username/readlist", async (req, res) => {
    const user = await req.models.User.findOne({username: req.params.username});
    if (!user) {
        return res.status(404).json({
            status: "error",
            error: `username: ${req.params.username} not found`
        });
    }
    console.log (req.params.username + ":" + user);
    res.status(200).json(user.readList);
});

router.get("/:username/taglist", async (req, res) => {
    const user = await req.models.User.findOne({username: req.params.username});
    if (!user) {
        return res.status(404).json({
            status: "error",
            error: `username: ${req.params.username} not found`
        });
    }
    console.log (req.params.username + ":" + user);
    res.status(200).json(user.tagList);
});

// DELETE /api/v1/users/readingList
router.delete("/readingList/:bookId", requireLogin, async (req, res) => {
  try {
    const { bookId } = req.params;
    const username = req.session.account.username;

    const user = await req.models.User.findOne({ username });
    if (!user) {
      return res.status(404).json({status: "error", error: "user not found" });
    }

    // Pull bookId from readList array
    user.readList = (user.readList || []).filter(
      (id) => id.toString() !== bookId
    );
    await user.save();

    return res.json({ status: "success" });
  }
  catch (err) {
    console.error("DELETE /api/v1/users/readingList/:bookId error:", err);
    return res.status(500).json({ status: "error", error: "Internal error updating reading list"});
  }
});


// GET /api/v1/users/myIdentity
router.get("/myIdentity", async (req, res) => {
  try {
    if (!req.session?.isAuthenticated || !req.session.account) {
      return res.json({ status: "loggedout" });
    }

    const account = req.session.account;
    const username = account.username;          // e.g. varshabh@uw.edu
    const name = account.name || username;

    // find or create User in Mongo
    let user = await req.models.User.findOne({ username });
    if (!user) {
      user = new req.models.User({
        username,
        displayName: name,
        readList: [],
        tagList: [],
        friendLists: [],
      });
      await user.save();
    }

    return res.json({
      status: "loggedin",
      userInfo: {
        username,
        name,
        displayName: user.displayName || name,
      },
    });
  } catch (err) {
    console.error("GET /api/v1/users/myIdentity error:", err);
    return res.status(500).json({
      status: "error",
      error: "Internal error checking identity",
    });
  }
});

// GET /api/v1/users/myBooks
router.get("/myBooks", requireLogin, async (req, res) => {
  try {
    const username = req.session.account.username;

    const user = await req.models.User.findOne({ username });
    if (!user) {
      return res.json({ books: [] });
    }

    const books = await req.models.Book.find({
      addedByUser: user._id,
    });

    return res.json({ books });
  } catch (err) {
    console.error("GET /api/v1/users/myBooks error:", err);
    return res.status(500).json({
      status: "error",
      error: "Internal error loading books",
    });
  }
});

// GET /api/v1/users/myReviews
router.get("/myReviews", requireLogin, async (req, res) => {
  try {
    const username = req.session.account.username;

    const user = await req.models.User.findOne({ username });
    if (!user) {
      return res.json({ reviews: [] });
    }

    const userId = user._id.toString();

    // Load all books and their notes with users populated
    const books = await req.models.Book.find({}).populate({
      path: "noteList",
      populate: { path: "noteByUser", select: "username displayName" },
    });

    const reviews = [];

    for (const book of books) {
      for (const note of book.noteList || []) {
        if (
          note.noteByUser &&
          note.noteByUser._id &&
          note.noteByUser._id.toString() === userId
        ) {
          reviews.push({
            _id: note._id,
            bookId: book._id,
            bookTitle: book.title || "(Unknown book)",
            ratingLevel: note.ratingLevel ?? null,
            textBody: note.textBody || "",
            dateAdded: note.dateAdded || null,
          });
        }
      }
    }

    return res.json({ reviews });
  }
  catch (err) {
    console.error("GET /api/v1/users/myReviews error:", err);
    return res.status(500).json({
      status: "error",
      error: "Internal error loading reviews",
    });
  }
});

// GET /api/v1/users/myReadingList
router.get("/myReadingList", requireLogin, async (req, res) => {
  try {
    const username = req.session.account.username;

    const user = await req.models.User.findOne({ username }).populate("readList");
    if (!user) {
      return res.json({ books: [] });
    }

    // IMPORTANT: profile.js expects data.books
    const books = user.readList || [];
    return res.json({ books });
  }
  catch (err) {
    console.error("GET /api/v1/users/myReadingList error:", err);
    return res.status(500).json({
      status: "error",
      error: "Internal error loading reading list",
    });
  }
});

// POST /api/v1/users/readingList
router.post("/readingList", requireLogin, async (req, res) => {
  try {
    const { bookId } = req.body || {};
    if (!bookId) {
      return res.status(400).json({status: "error", error: "bookId is required"});
    }

    // Optionally validate ObjectId
    // if (!mongoose.Types.ObjectId.isValid(bookId)) {
    //   return res.status(400).json({
    //     status: "error",
    //     error: "invalid bookId",
    //   });
    // }

    const username = req.session.account.username;

    // Find or create the user
    let user = await req.models.User.findOne({ username });
    // if (!user) {
    //   user = new req.models.User({
    //     username,
    //     displayName: req.session.account.name || username,
    //     readList: [],
    //     tagList: [],
    //     friendLists: [],
    //   });
    // }

    // Make sure the book exists
    const book = await req.models.Book.findById(bookId);
    if (!book) {
      return res.status(404).json({status: "error", error: "book not found"});
    }

    // Add if not already present
    const alreadyInList = (user.readList || []).some(
      (id) => id.toString() === bookId
    );

    if (!alreadyInList) {
      user.readList.push(book._id);
      await user.save();
    }

    return res.json({ status: "success" });
  }
  catch (err) {
    console.error("POST /api/v1/users/readingList error:", err);
    return res.status(500).json({status: "error",error: "Internal error updating reading list"});
  }
});

export default router;
