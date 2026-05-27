import express from "express";

const router = express.Router();
const GOOGLE_BOOKS_BASE_URL = "https://www.googleapis.com/books/v1/volumes";

function normalizeCoverUrl(url) {
  if (!url) {
    return "";
  }

  return String(url).replace(/^http:\/\//i, "https://");
}

function parsePublishedYear(publishedDate) {
  if (!publishedDate) {
    return undefined;
  }

  const yearMatch = String(publishedDate).match(/\d{4}/);
  return yearMatch ? Number(yearMatch[0]) : undefined;
}

function pickIndustryIdentifier(identifiers = [], type) {
  const match = identifiers.find((identifier) => identifier.type === type);
  return match ? match.identifier : "";
}

function normalizeGoogleBook(item) {
  const volumeInfo = item?.volumeInfo || {};
  const authors = Array.isArray(volumeInfo.authors) ? volumeInfo.authors : [];
  const industryIdentifiers = Array.isArray(volumeInfo.industryIdentifiers)
    ? volumeInfo.industryIdentifiers
    : [];

  const isbn13 = pickIndustryIdentifier(industryIdentifiers, "ISBN_13");
  const isbn10 = pickIndustryIdentifier(industryIdentifiers, "ISBN_10");
  const ISBN = isbn13 || isbn10 || "";

  return {
    googleBooksId: item.id,
    ISBN,
    title: volumeInfo.title || "(Untitled)",
    authorName: authors.join(", "),
    year: parsePublishedYear(volumeInfo.publishedDate),
    publisher: volumeInfo.publisher || "",
    addedByUser: null,
    coverUrl: normalizeCoverUrl(
      volumeInfo.imageLinks?.thumbnail ||
      volumeInfo.imageLinks?.smallThumbnail ||
      "",
    ),
    source: "google",
  };
}

async function fetchGoogleBooks(query) {
  const googleBooksApiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const url = new URL(GOOGLE_BOOKS_BASE_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", "12");
  url.searchParams.set("printType", "books");
  if (googleBooksApiKey) {
    url.searchParams.set("key", googleBooksApiKey);
  }

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Google Books request failed with status ${resp.status}`);
  }

  const data = await resp.json();
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map(normalizeGoogleBook);
}

function buildBookFingerprint(book) {
  if (book.ISBN) {
    return `isbn:${String(book.ISBN).toLowerCase()}`;
  }

  const title = String(book.title || "").toLowerCase().trim();
  const author = String(book.authorName || "").toLowerCase().trim();
  return `title:${title}|author:${author}`;
}

async function findExistingBook(BookModel, book) {
  if (book.googleBooksId) {
    const existingByGoogleId = await BookModel.findOne({
      googleBooksId: book.googleBooksId,
    });
    if (existingByGoogleId) {
      return existingByGoogleId;
    }
  }

  if (book.ISBN) {
    const existingByIsbn = await BookModel.findOne({ ISBN: book.ISBN });
    if (existingByIsbn) {
      return existingByIsbn;
    }
  }

  if (book.googleBooksId || book.ISBN) {
    return null;
  }

  const title = String(book.title || "").trim();
  const authorName = String(book.authorName || "").trim();

  if (!title) {
    return null;
  }

  return BookModel.findOne({
    title,
    authorName,
  });
}

function mergeBookFields(existingBook, incomingBook) {
  const fieldsToCopy = [
    "googleBooksId",
    "ISBN",
    "title",
    "authorName",
    "authorFirstName",
    "authorMiddleName",
    "authorLastName",
    "year",
    "publisher",
    "edition",
    "coverUrl",
    "source",
  ];

  for (const field of fieldsToCopy) {
    const value = incomingBook[field];
    if (value !== undefined && value !== null && value !== "") {
      existingBook[field] = value;
    }
  }
}

async function upsertBookRecord(BookModel, incomingBook) {
  const existingBook = await findExistingBook(BookModel, incomingBook);

  if (existingBook) {
    mergeBookFields(existingBook, incomingBook);
    await existingBook.save();
    return existingBook;
  }

  const createdBook = new BookModel({
    ...incomingBook,
    noteList: Array.isArray(incomingBook.noteList) ? incomingBook.noteList : [],
    addedByUser: incomingBook.addedByUser ?? null,
  });
  await createdBook.save();
  return createdBook;
}

async function persistGoogleResults(BookModel, books) {
  const persistedById = new Map();

  for (const book of books) {
    const savedBook = await upsertBookRecord(BookModel, book);
    persistedById.set(String(savedBook._id), savedBook);
  }

  return BookModel.populate([...persistedById.values()], {
    path: "addedByUser",
    select: "username displayName",
  });
}

async function searchLocalBooks(BookModel, keyword) {
  const regex = new RegExp(keyword, "i");
  return BookModel.find({
    $or: [
      { title: regex },
      { authorName: regex },
      { ISBN: regex },
      { publisher: regex },
    ],
  }).populate("addedByUser", "username displayName");
}

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

// ISBN LOOKUP / AUTOFILL - GET /api/v1/books/autofill?isbn=...
router.get("/autofill", async (req, res) => {
  try {
    const rawIsbn = String(req.query.isbn || "").trim();
    const isbn = rawIsbn.replace(/[^0-9Xx]/g, "");

    if (!isbn) {
      return res.status(400).json({
        status: "error",
        error: "isbn is required",
      });
    }

    const existingBook = await req.models.Book.findOne({ ISBN: isbn })
      .populate("addedByUser", "username displayName");

    if (existingBook) {
      return res.json({
        status: "success",
        book: existingBook,
      });
    }

    const results = await fetchGoogleBooks(`isbn:${isbn}`);
    const book = results.find((result) => result.ISBN) || results[0];

    if (!book) {
      return res.status(404).json({
        status: "error",
        error: "No book found for that ISBN.",
      });
    }

    return res.json({
      status: "success",
      book,
    });
  }
  catch (error) {
    console.log("Autofill error:", error);
    return res.status(500).json({
      status: "error",
      error: error.message ?? String(error),
    });
  }
});

// ADD BOOK - POST /api/v1/books
router.post("/", async (req, res) => {
  try {
    if (!req.session?.isAuthenticated) {
      return res.status(401).json({ status: "error", error: "not logged in" });
    }

    const account = req.session.account;
    const username = account.username;
    const displayName = account.name || username;

    const {
      ISBN,
      title,
      authorName,
      authorFirstName,
      authorMiddleName,
      authorLastName,
      year,
      publisher = "",
      edition = "",
      coverUrl = "",
      googleBooksId = "",
    } = req.body || {};

    if (!title || !ISBN) {
      return res.status(400).json({
        status: "error",
        error: "title and ISBN are required",
      });
    }

    let userObj = await req.models.User.findOne({ username });
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

    const info = await upsertBookRecord(req.models.Book, {
      ISBN,
      googleBooksId,
      title,
      authorName,
      authorFirstName,
      authorMiddleName,
      authorLastName,
      year,
      publisher,
      edition,
      coverUrl: normalizeCoverUrl(coverUrl),
      source: "bookshare",
      addedByUser: userObj._id,
    });

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

// SEARCH BOOKS - GET /api/v1/books/search?keyword=x
router.get("/search", async (req, res) => {
  try {
    const keyword = String(req.query.keyword || "").trim();

    if (!keyword) {
      return res.json({ status: "success", results: [] });
    }

    let googleBooksAvailable = true;
    let googleBooksWarning = "";

    const [localResults, googleResults] = await Promise.all([
      searchLocalBooks(req.models.Book, keyword),
      fetchGoogleBooks(keyword).catch((error) => {
        googleBooksAvailable = false;
        googleBooksWarning = error.message ?? String(error);
        console.log("Google Books search error:", error);
        return [];
      }),
    ]);

    const persistedGoogleResults = await persistGoogleResults(
      req.models.Book,
      googleResults,
    );

    const mergedResults = [];
    const seen = new Set();

    for (const book of localResults) {
      seen.add(buildBookFingerprint(book));
      mergedResults.push(book);
    }

    for (const book of persistedGoogleResults) {
      const fingerprint = buildBookFingerprint(book);
      if (seen.has(fingerprint)) {
        continue;
      }

      seen.add(fingerprint);
      mergedResults.push(book);
    }

    return res.json({
      status: "success",
      results: mergedResults,
      googleBooksAvailable,
      googleBooksWarning,
    });
  }
  catch (error) {
    console.log("Search error:", error);
    return res.status(500).json({
      status: "error",
      error: error.message ?? String(error),
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
      error: `bookId: ${req.params.bookId} not found`,
    });
  }

  console.log("book:" + book);
  res.status(200).json(book.noteList);
});

// add a review to one book
router.post("/:bookId/notes", async (req, res) => {
  try {
    const { textBody, ratingLevel, taggedUsernames } = req.body;

    if (!req.session?.isAuthenticated) {
      return res.status(401).json({ status: "error", error: "not logged in" });
    }

    const account = req.session.account;
    const username = account.username;

    const userObjt = await req.models.User.findOne({ username });
    if (!userObjt) {
      return res.status(400).json({
        status: "error",
        error: "Current user not found in User collection",
      });
    }

    let tagsArray = [];
    if (Array.isArray(taggedUsernames)) {
      tagsArray = taggedUsernames;
    }
    else if (typeof taggedUsernames === "string") {
      tagsArray = taggedUsernames
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    const taggedUsersDocs = await req.models.User.find({
      username: { $in: tagsArray },
    });

    const taggedUserIds = taggedUsersDocs.map((u) => u._id);

    const createReview = new req.models.NoteEntry({
      noteByUser: userObjt._id,
      textBody,
      ratingLevel,
      likes: [],
      visibleTo: [],
      dateAdded: new Date(),
      taggedUsers: taggedUserIds,
      book: req.params.bookId,
    });

    await createReview.save();

    const book = await req.models.Book.findById(req.params.bookId);
    if (!book) {
      return res.status(404).json({
        status: "error",
        error: "book not found",
      });
    }

    book.noteList.push(createReview._id);
    await req.models.Book.updateOne(
      { _id: book._id },
      { $set: { noteList: book.noteList } }
    );

    return res.status(200).json({ status: "success" });
  }
  catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "error",
      error,
    });
  }
});

export default router;
