const DISCOVER_PREVIEW_COUNT = 8;

function getLibraryMode() {
  return document.body?.dataset?.page === "library" ? "library" : "discover";
}

function openBookDetails(bookId) {
  if (!bookId) {
    return;
  }

  window.location.href = `/book/${encodeURIComponent(bookId)}`;
}

function handleBookCardKeydown(event, bookId) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  openBookDetails(bookId);
}

function renderBookCard(book) {
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
    ? `<a href="/book/${encodeURIComponent(book._id)}">View details &amp; reviews →</a>`
    : "";

  const coverUrl = getBookCoverUrl(book, "M");
  const rawPostedBy = book.addedByUser?.username || "unknown";
  const sourceHtml = book.source === "google"
    ? `<div class="book-meta">From Google Books</div>`
    : "";

  const postedByHtml = rawPostedBy === "unknown"
    ? "unknown"
    : `<a href="/profile.html">${escapeHTML(rawPostedBy)}</a>`;

  return `
    <article
      class="book-card ${book._id ? "book-card-clickable" : ""}"
      ${book._id ? `onclick="openBookDetails('${book._id}')" tabindex="0" role="link" onkeydown="handleBookCardKeydown(event, '${book._id}')"` : ""}
    >
      <img
        class="book-cover"
        src="${coverUrl}"
        alt="Cover of ${escapeHTML(title)}"
        onerror="this.src='/images/no-cover.png'"
      >
      <div class="book-card-body">
        <h3 class="book-title">
          ${escapeHTML(title)} ${yearHtml}
        </h3>
        ${authorHtml}
        ${isbnHtml}
        ${sourceHtml}
        <div class="book-posted-by">
          Posted by: ${postedByHtml}
        </div>

        <div class="book-actions">
          ${book._id ? `<a href="/book/${encodeURIComponent(book._id)}" onclick="event.stopPropagation()">View details &amp; reviews →</a>` : ""}
          ${
            book._id
              ? `<button class="btn btn-outline-secondary btn-sm" onclick="event.stopPropagation(); addToReadingList('${book._id}', this)">
                  Add to my list
                </button>`
              : ""
          }
        </div>
      </div>
    </article>
  `;
}

function renderLoadMoreLink(totalBooks, shownBooks) {
  if (getLibraryMode() !== "discover" || totalBooks <= shownBooks) {
    return "";
  }

  return `
    <div class="load-more-row">
      <a href="/all-books.html" class="btn btn-outline-secondary">
        Load more books
      </a>
    </div>
  `;
}

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

  searchBooks();
}

async function searchBooks() {
  const resultsDiv = document.getElementById("search_results")
                     || document.getElementById("results");
  const footerDiv = document.getElementById("search_results_footer");
  if (!resultsDiv) {
    return;
  }

  if (footerDiv) {
    footerDiv.innerHTML = "";
  }

  resultsDiv.innerHTML = `
    <div class="empty-state">
      <h3>Loading books</h3>
      <p>Pulling the latest library results now.</p>
    </div>
  `;

  const inputEl = document.getElementById("book_search_input");
  const keyword = inputEl ? inputEl.value.trim() : "";

  try {
    let booksJson;
    let externalWarningHtml = "";
    let displayBooks;

    if (keyword) {
      const searchResult = await fetchJSON(
        `/api/v1/books/search?keyword=${encodeURIComponent(keyword)}`
      );
      booksJson = searchResult.results || [];
      if (searchResult.googleBooksAvailable === false) {
        externalWarningHtml = `
          <div class="empty-state search-warning">
            <h3>Showing BookShare matches only</h3>
            <p>Google Books is unavailable right now, so external search results could not be loaded.</p>
          </div>
        `;
      }
    } else {
      booksJson = await fetchJSON("/api/v1/books");
    }

    if (!Array.isArray(booksJson) || booksJson.length === 0) {
      resultsDiv.innerHTML = `
        ${externalWarningHtml}
        <div class="empty-state">
          <h3>${keyword ? "No books matched that search" : "No books in the library yet"}</h3>
          <p>${keyword ? "Try a different title or author." : "Add the first title to start the shared library."}</p>
        </div>
      `;
      return;
    }

    if (!keyword && getLibraryMode() === "discover") {
      displayBooks = booksJson.slice(0, DISCOVER_PREVIEW_COUNT);
    } else {
      displayBooks = booksJson;
    }

    const booksHtml = displayBooks.map(renderBookCard).join("\n");
    const loadMoreHtml = !keyword
      ? renderLoadMoreLink(booksJson.length, displayBooks.length)
      : "";

    document.getElementById("search_results").innerHTML = `
      ${externalWarningHtml}
      ${booksHtml}
    `;

    if (footerDiv) {
      footerDiv.innerHTML = loadMoreHtml;
    }

  }
  catch (error) {
    console.log("Error searching/loading books:", error);
    if (footerDiv) {
      footerDiv.innerHTML = "";
    }
    resultsDiv.innerHTML = `
      <div class="empty-state">
        <h3>Couldn’t load books</h3>
        <p>Please try your search again in a moment.</p>
      </div>
    `;
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
  const coverUrlEl = document.getElementById("add_book_cover_url_input");
  const googleIdEl = document.getElementById("add_book_google_id_input");
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
        coverUrl: coverUrlEl ? coverUrlEl.value.trim() : "",
        googleBooksId: googleIdEl ? googleIdEl.value.trim() : "",
      },
    });

    msgEl.innerText = "✅ Book added.";

    titleEl.value = "";
    authorNameEl.value = "";
    yearEl.value = "";
    isbnEl.value = "";
    if (coverUrlEl) {
      coverUrlEl.value = "";
    }
    if (googleIdEl) {
      googleIdEl.value = "";
    }

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
  const coverUrlEl = document.getElementById("add_book_cover_url_input");
  const googleIdEl = document.getElementById("add_book_google_id_input");
  const msgEl = document.getElementById("add_book_message");

  const isbn = isbnEl ? isbnEl.value.trim() : "";
  if (!isbn) return;

  try {
    if (msgEl) {
      msgEl.innerText = "Looking up book details...";
    }

    const result = await fetchJSON(
      `/api/v1/books/autofill?isbn=${encodeURIComponent(isbn)}`
    );
    const data = result.book || {};

    if (titleEl) {
      titleEl.value = data.title || "";
    }

    if (authorNameEl) {
      authorNameEl.value = data.authorName || "";
    }

    if (yearEl) {
      yearEl.value = data.year ? String(data.year) : "";
    }

    if (coverUrlEl) {
      coverUrlEl.value = data.coverUrl || "";
    }

    if (googleIdEl) {
      googleIdEl.value = data.googleBooksId || "";
    }

    if (msgEl) {
      msgEl.innerText = data.title
        ? "Book details loaded from Google Books."
        : "";
    }
  } catch (err) {
    console.log("Error autofilling from ISBN:", err);
    if (msgEl) {
      msgEl.innerText = "No Google Books match found for that ISBN.";
    }
  }
}

async function addToReadingList(bookId, btn) {
  const actionsEl = btn ? btn.closest(".book-actions") : null;
  let msgEl = actionsEl ? actionsEl.querySelector(".signin-inline-message") : null;

  if (!msgEl && actionsEl) {
    msgEl = document.createElement("div");
    msgEl.className = "message-line signin-inline-message";
    actionsEl.appendChild(msgEl);
  }

  if (!window.myIdentity) {
    showInlineSignInPrompt(
      msgEl,
      "Please sign in to save this book to your reading list.",
    );
    return;
  }

  try {
    if (msgEl) {
      msgEl.textContent = "Adding...";
    }

    const result = await fetchJSON("/api/v1/users/readingList", {
      method: "POST",
      body: { bookId }
    });

    if (result.status === "success") {
      btn.innerText = "Added to list ✓";
      btn.disabled = true;
      btn.classList.add("added");
      if (msgEl) {
        msgEl.textContent = "";
      }

      console.log("Book added to list");
    }
  }
  catch (err) {
    console.error("Error adding to list:", err);
    const message = String(err.message || err);
    if (message.includes("Status: 401") || message.includes('"not logged in"')) {
      showInlineSignInPrompt(
        msgEl,
        "Please sign in to save this book to your reading list.",
      );
      return;
    }

    if (msgEl) {
      msgEl.textContent = "Unable to add to your reading list. Please try again.";
    }
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
