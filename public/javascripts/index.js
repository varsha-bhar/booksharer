async function init() {
  // Wire up live search on Enter key (optional, like urlInput handlers there)
  const searchInput = document.getElementById("book_search_input");
  if (searchInput) {
    searchInput.onkeyup = (event) => {
      if (event.key === "Enter") {
        searchBooks();
      }
    };
  }

  // identity.js loads identity UI (even if it's just a temp user for now)
  if (typeof loadIdentity === "function") {
    await loadIdentity();
  }

  // On first load, show all books (same idea as loadPosts())
  searchBooks();
}

async function searchBooks() {
  const resultsDiv = document.getElementById("search_results")
                     || document.getElementById("results");
  if (!resultsDiv) {
    return;
  }

  resultsDiv.innerText = "Loading...";

  const inputEl = document.getElementById("book_search_input");
  const keyword = inputEl ? inputEl.value.trim() : "";

  try {
    let booksJson;

    if (keyword) {
      // search: GET /api/v1/books/search?keyword=...
      const searchResult = await fetchJSON(
        `/api/v1/books/search?keyword=${encodeURIComponent(keyword)}`
      );
      booksJson = searchResult.results || [];
    } else {
      // no keyword → list all books
      booksJson = await fetchJSON("/api/v1/books");
    }

    if (!Array.isArray(booksJson) || booksJson.length === 0) {
      resultsDiv.innerText = keyword
        ? "No books found for that search."
        : "No books in the library yet.";
      return;
    }

    const booksHtml = booksJson
    .map((book) => {
        const title = book.title || "(Untitled)";

        const author = book.authorName || "";
        const authorHtml = author
        ? `<div class="book-author">${escapeHTML(author)}</div>`
        : `<div class="book-author text-muted">Author unknown</div>`;

        const yearHtml = book.year
        ? `<span class="book-year">(${escapeHTML(String(book.year))})</span>`
        : "";

        const isbnHtml = book.ISBN
        ? `<div class="book-meta">ISBN: ${escapeHTML(book.ISBN)}</div>`
        : "";

        const linkHtml = book._id
        ? `<a href="/book/${encodeURIComponent(
            book._id
            )}">View details &amp; reviews →</a>`
        : "";

        const coverUrl = book.ISBN
        ? `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(
            book.ISBN
            )}-M.jpg`
        : "/images/no-cover.png";

        const rawPostedBy = book.addedByUser?.username || "unknown";

        const postedByHtml =
        rawPostedBy === "unknown"
            ? "unknown"
            : `<a href="/profile.html">${escapeHTML(rawPostedBy)}</a>`;

        return `
        <div class="book-card d-flex gap-3 align-items-start mb-3">
            <img
            src="${coverUrl}"
            alt="Cover of ${escapeHTML(title)}"
            style="width:100px; height:auto; border:1px solid #ccc;"
            onerror="this.src='/images/no-cover.png'"
            >
            <div class="book-info">
            <h3 class="book-title">
                ${escapeHTML(title)} ${yearHtml}
            </h3>
            ${authorHtml}
            ${isbnHtml}
            <div class="book-posted-by text-muted" style="font-size:0.9em;">
                Posted by: ${postedByHtml}
            </div>

            <div class="mt-2 d-flex flex-wrap gap-2">
                ${linkHtml}
                ${
                book._id
                    ? `<button class="btn btn-outline-secondary btn-sm" onclick="addToReadingList('${book._id}', this)">
                        Add to my list
                    </button>`
                    : ""
                }
            </div>
            </div>
        </div>
        `;
    })
    .join("\n");

    document.getElementById("search_results").innerHTML = booksHtml;

  }
  catch (error) {
    console.log("Error searching/loading books:", error);
    resultsDiv.innerText = "Error searching books.";
  }
}

// READING LIST
async function loadReadingList() {
  const username = window.myIdentity;

  if (!username) {
    document.getElementById("results").innerText =
      "Please sign in to view your reading list.";
    return;
  }

  try {
    const response = await fetch(
      `/api/v1/users/${encodeURIComponent(username)}/readlist`,
      { method: "GET" }
    );

    const text = await response.text();
    document.getElementById("results").innerText = text;
  }
  catch (e) {
    document.getElementById("results").innerText =
      "Error loading reading list.";
  }
}

// TAGGED BOOKS
async function loadTaggedBooks() {
  const username = window.myIdentity;

  if (!username) {
    document.getElementById("results").innerText =
      "Please sign in to view your tagged books.";
    return;
  }

  try {
    const response = await fetch(
      `/api/v1/users/${encodeURIComponent(username)}/taglist`,
      { method: "GET" }
    );

    const text = await response.text();
    document.getElementById("results").innerText = text;
  } catch (e) {
    document.getElementById("results").innerText =
      "Error loading tagged books.";
  }
}

// CREATE FRIEND LIST
async function createFriendList() {
  try {
    const response = await fetch(`/api/v1/users/friendlist`, {
      method: "POST",
    });

    const text = await response.text();
    document.getElementById("results").innerText = text;
  } catch (error) {
    document.getElementById("results").innerText =
      "Error creating friend list.";
  }
}

// ADD BOOK TO DATABASE
async function addBook() {
  const titleEl = document.getElementById("add_book_title_input");
  const authorNameEl = document.getElementById("add_book_authorName_input");
  const yearEl = document.getElementById("add_book_year_input");
  const isbnEl = document.getElementById("add_book_ISBN_input");
  const msgEl = document.getElementById("add_book_message");

  const title = titleEl.value.trim();
  const authorName = authorNameEl.value.trim();
  const yearValue = yearEl.value.trim();
  const ISBN = isbnEl.value.trim();

  msgEl.innerText = "";

  if (!window.myIdentity) {
    msgEl.innerText = "Please sign in to add a book.";
    return;
  }

  if (!ISBN) {
    msgEl.innerText = "ISBN is required.";
    return;
  }

  try {
    msgEl.innerText = "Saving book...";

    await fetchJSON("/api/v1/books", {
      method: "POST",
      body: {
        ISBN,
        title,
        authorName,
        year: yearValue ? Number(yearValue) : undefined,
      },
    });

    msgEl.innerText = "✅ Book added.";

    titleEl.value = "";
    authorNameEl.value = "";
    yearEl.value = "";
    isbnEl.value = "";

    if (typeof searchBooks === "function") {
      searchBooks();
    }
  } catch (err) {
    console.error("Error adding book:", err);
    const msg = String(err.message || err);
    if (msg.includes("Status: 401") || msg.includes('"not logged in"')) {
      msgEl.innerText = "Please sign in to add a book.";
    } 
    else {
      msgEl.innerText = "Error adding book.";
    }
  }
}

// OPTIONAL: placeholder for future ISBN autofill
async function autofillFromISBN() {
  const isbnEl = document.getElementById("add_book_ISBN_input");
  const titleEl = document.getElementById("add_book_title_input");
  const authorNameEl = document.getElementById("add_book_authorName_input");
  const yearEl = document.getElementById("add_book_year_input");

  const isbn = isbnEl ? isbnEl.value.trim() : "";
  if (!isbn) return;

  try {
    // 1) Get book metadata from OpenLibrary
    const url = `https://openlibrary.org/isbn/${isbn}.json`;
    const resp = await fetch(url);

    if (!resp.ok) {
      console.log("No metadata found for ISBN", isbn);
      return;
    }

    const data = await resp.json();

    // --- Title ---
    if (data.title && titleEl && !titleEl.value) {
      titleEl.value = data.title;
    }

    // --- Publish year ---
    if (data.publish_date && yearEl && !yearEl.value) {
      // publish_date might be "March 12, 2004" or "2004"
      const yearMatch = data.publish_date.match(/\d{4}/);
      if (yearMatch) {
        yearEl.value = yearMatch[0];
      }
    }

    // --- Author full name ---
    // data.authors is usually like [{ key: "/authors/OL12345A" }, ...]
    if (data.authors && data.authors.length > 0 && authorNameEl && !authorNameEl.value) {
      const authorKey = data.authors[0].key; // e.g. "/authors/OL12345A"
      const authorResp = await fetch(`https://openlibrary.org${authorKey}.json`);
      if (authorResp.ok) {
        const authorData = await authorResp.json();
        if (authorData && authorData.name) {
          // authorData.name is usually full name already (e.g. "Jane Austen")
          authorNameEl.value = authorData.name;
        }
      }
    }

  } catch (err) {
    console.log("Error autofilling from ISBN:", err);
  }
}

async function addToReadingList(bookId, btn) {
  try {
    // call API
    const result = await fetchJSON("/api/v1/users/readingList", {
      method: "POST",
      body: { bookId }
    });

    if (result.status === "success") {
      // Change button UI
      btn.innerText = "Added to list ✓";
      btn.disabled = true;
      btn.classList.add("added");

      console.log("Book added to list");
    }
  }
  catch (err) {
    console.error("Error adding to list:", err);
    alert("Unable to add to your reading list. Please try again.");
  }
}

// ADD NOTE / REVIEW
async function addNote(){
    let bookId = document.getElementById("note_book_id_input").value;
    let textBody = document.getElementById("note_text_input").value;
    let rating = document.getElementById("note_rating_input").value;

    let response = await fetch(`/api/v1/books/${bookId}/notes`, {
        method: "POST",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            textBody: textBody,
            ratingLevel: rating
        })
    });

    let text = await response.text();
    document.getElementById("results").innerText = text;
}


// LOAD NOTES
async function loadNotes(){
    let bookId = document.getElementById("load_notes_book_id_input").value;

    let response = await fetch(`/api/v1/books/${bookId}/notes`, {
        method: "GET"
    });

    let text = await response.text();
    document.getElementById("notes_list_div").innerText = text;
}

// PAGE INIT (IMPORTANT)
window.addEventListener("load", init);
