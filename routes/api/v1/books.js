import express from "express";

const router = express.Router();

// return all books
router.get("/", async (req, res) => {
    const books = await req.models.Book.find({});
    res.status(200).json(books);
});

// return a specific book
router.get("/:bookId", async (req, res) => {
    const book = await req.models.Book.findById(req.params.bookId);
    if (!book) {
        return res.status(404).json({
            status: "error",
            error: "book not found"
        });
    }
    res.status(200).json(book);
});

// ADD BOOK FUNCTIONAlITY
router.post("/", async (req, res) => {
    try {
        // if (!req.session.account) {
        //     return res.status(401).json({
        //         status: "error",
        //         error: "not logged in"
        //     });
        // }

        //TEMP
        const currentUser = "testuser";

        // fetch the id for currentUser
        const userObj = await req.models.User.find({username: currentUser});

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
        const newBook = new req.models.Book({
            ISBN,
            title,
            authorFirstName,
            authorMiddleName,
            authorLastName,
            year,
            publisher,
            edition,
            noteList: [],
            addedByUser: userObj._id,   //TODO: this doesn't get added in the record
        });

        // saves the new book so that users can review it

        await newBook.save();

        return res.status(200).json({
            status: "success",
            bookId: newBook._id
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            status: "error",
            error: error
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
        // if (!req.session.account) {
        //     return res.status(401).json({
        //         status: "error",
        //         error: "not logged in"
        //     });
        // }

        //TEMP
        const currentUser = "testuser";

        // fetch the id for currentUser
        const userObj = await req.models.User.find({username: currentUser});

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


// SEARCH THROUGH BOOKS FUNCTIONALITY
router.get("/search", async (req, res) => {
    try {
        const { keyword } = req.query;

        if (!keyword) {
            return res.json({ status: "success", results: [] });
        }

        const lowerKey = keyword.toLowerCase();

        // load all books
        const allBooks = await req.models.Book.find();

        // can search for books based on title, author name (first, middle, and last), ISBN, and publisher
        const results = allBooks.filter(book => {

            if (book.title && book.title.toLowerCase().includes(lowerKey)) return true;
            if (book.authorFirstName && book.authorFirstName.toLowerCase().includes(lowerKey)) return true;
            if (book.authorMiddleName && book.authorMiddleName.toLowerCase().includes(lowerKey)) return true;
            if (book.authorLastName && book.authorLastName.toLowerCase().includes(lowerKey)) return true;
            if (book.ISBN && book.ISBN.toLowerCase().includes(lowerKey)) return true;
            if (book.publisher && book.publisher.toLowerCase().includes(lowerKey)) return true;

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
