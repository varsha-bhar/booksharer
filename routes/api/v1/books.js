import express from "express";

const router = express.Router();

// GET ALL BOOKS /api/v1/books
router.get("/", async (req, res) => {
  try {
    const books = await req.models.Book.find({})
      .populate("addedByUser", "username displayName");
    return res.status(200).json(books);
  }
  catch (err) {
    console.log("Error fetching all books:", err);
    return res.status(500).json({
      status: "error",
      error: err.message ?? String(err),
    });
  }
});

// ADD BOOK - POST /api/v1/books
router.post("/", async (req, res) => {
  try {
    // if logged out
    if (!req.session?.isAuthenticated) {
      return res.status(401).json({ status: "error", error: "not logged in" });
    }

    const account = req.session.account; // set by msal-node-wrapper
    const username = account.username;   // e.g. your UW email
    const displayName = account.name || username;

    const {
      ISBN,
      title,
      authorFirstName,
      authorMiddleName,
      authorLastName,
      year,
      publisher = "",
      edition = "",
    } = req.body || {};

    // Basic validation: require at least title + ISBN
    if (!title || !ISBN) {
      return res.status(400).json({
        status: "error",
        error: "title and ISBN are required",
      });
    }

    // Prevent duplicate ISBNs (optional but nice)
    if (ISBN) {
      const existing = await req.models.Book.findOne({ ISBN });
      if (existing) {
        return res.status(400).json({
          status: "error",
          error: "Book with this ISBN already exists.",
        });
      }
    }

    // Find or create the user document for this logged-in account
    let userObj = await req.models.User.findOne({ username });  //TODO: does this work?
    if (!userObj) {
      userObj = new req.models.User({
        username,
        displayName,
        readList: [],
        tagList: [],
        friendLists: [],
      });
      await userObj.save();
    }

    // Create and save the Book
    const Book = req.models.Book;

    const info = new Book({
      ISBN,
      title,
      authorFirstName,
      authorMiddleName,
      authorLastName,
      year,
      publisher,
      edition,
      noteList: [],
      addedByUser: userObj._id,   // link to the user who posted it
    });

    await info.save();
    return res.json({ status: "success", bookId: info._id });
  }
  catch (err) {
    console.error("POST /api/v1/books error:", err);
    return res.status(500).json({
      status: "error",
      error: err?.message ?? String(err),
    });
  }
});

// GET SINGLE BOOK - GET /api/v1/books/:bookId
router.get("/:bookId", async (req, res) => {
  try {
    const book = await req.models.Book.findById(req.params.bookId)
      .populate("addedByUser", "username displayName");

    if (!book) {
      return res.status(404).json({
        status: "error",
        error: `Book ${req.params.bookId} not found`,
      });
    }

    return res.json(book);

  }
  catch (error) {
    console.log("Find book error:", error);
    return res.status(500).json({
      status: "error",
      error: error.message ?? String(error),
    });
  }
});

// return all reviews for one book
router.get("/:bookId/notes", async (req, res) => {
    const book = await req.models.Book.findOne({ _id: req.params.bookId });

    if (!book) {
        return res.status(404).json({
            status: "error",
            error: `bookId: ${req.params.bookId} not found`
        });
    }
    console.log("book:" + book);
    res.status(200).json(book.noteList);
});

// add a review to one book
router.post("/:bookId/notes", async (req, res) => {
    try {

        // if logged out
        if (!req.session?.isAuthenticated) {
          return res.status(401).json({ status: "error", error: "not logged in" });
        }

        const account = req.session.account; // set by msal-node-wrapper
        const username = account.username;   // e.g. your UW email
        const displayName = account.name || username;

        //TEMP
        const currentUser = "testuser";

        // fetch the id for currentUser
        const userObj = await req.models.User.find({username: username});

        // extract data from post body
        const { textBody, ratingLevel } = req.body;

        // create review:
        const createReview = new req.models.NoteEntry({
            noteByUser: userObj._id,    //TODO: this doesn't get added in the record
            textBody,
            ratingLevel,
            likes: [],
            visibleTo: [],
            dateAdded: new Date()
        });

        // save review that was created
        await createReview.save();

        // add the new review to that specific book's review page:
        const book = await req.models.Book.findById(req.params.bookId);
        if (!book) {
            return res.status(404).json({
                status: "error",
                error: "book not found"
            });
        }
        book.noteList.push(createReview._id);
        await req.models.Book.updateOne(
            { _id: book._id },
            { $set: { noteList: book.noteList } }
        );
        return res.status(200).json({ status: "success" });
        // end of adding the new review to that book's review page.
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            status: "error",
            error
        });
    }
});

// SEARCH BOOKS - GET /api/v1/books/search?keyword=x
router.get("/search", async (req, res) => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return res.json({ status: "success", results: [] });
    }

    const lowerKey = keyword.toLowerCase();

    const allBooks = await req.models.Book.find({})
      .populate("addedByUser", "username displayName");

    const results = allBooks.filter((book) => {
      if (book.title?.toLowerCase().includes(lowerKey)) return true;
      if (book.authorName?.toLowerCase().includes(lowerKey)) return true;
      if (book.ISBN?.toLowerCase().includes(lowerKey)) return true;
      if (book.publisher?.toLowerCase().includes(lowerKey)) return true;
      return false;
    });

    return res.json({
      status: "success",
      results,
    });

  }
  catch (error) {
    console.log("Search error:", error);
    return res.status(500).json({
      status: "error",
      error,
    });
  }
});


export default router;
