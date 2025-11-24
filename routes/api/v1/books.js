import express from "express";

const router = express.Router();

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
            addedByUser: userObj._id,
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

// return all books
router.get("/", async (req, res) => {
    const books = await req.models.Book.find({});
    res.status(200).json(books);
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
