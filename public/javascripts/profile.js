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
    ? `<a href="/book/${encodeURIComponent(
        book._id
      )}">View details &amp; reviews →</a>`
    : "";

  // same cover logic as main page
  const coverUrl = book.ISBN
    ? `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(
        book.ISBN
      )}-M.jpg`
    : "/images/no-cover.png";

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
        <div class="mt-2">
          ${linkHtml}
        </div>
      </div>
    </div>
  `;
}

function renderReadingListCard(book) {
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

  // same cover logic as main page
  const coverUrl = book.ISBN
    ? `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(
        book.ISBN
      )}-M.jpg`
    : "/images/no-cover.png";

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
       
        <div class="mt-2">
          ${linkHtml}
        </div>
      </div>
      <button class="btn btn-sm btn-outline-danger"
        onclick="removeFromReadingList('${book._id}', this)">
        Remove from list
    </button>
    </div>
  `;
}

async function initProfilePage() {
    const params = new URLSearchParams(window.location.search);
    const urlUser = params.get("user");

    // First, load identity (sets temp user or real auth)
    if (typeof loadIdentity === "function") {
        await loadIdentity();
    }

    // If a ?user= is provided, override whatever loadIdentity did
    if (urlUser) {
        window.myIdentity = urlUser;
    }

    // if not logged in, stop here
    if (!window.myIdentity) {
        const main = document.querySelector("main");
        if (main) {
            main.innerHTML = `
                <h1>My Profile</h1>
                <p>Please sign in to view your profile.</p>
            `;
        }
        return;
    }

    const usernameEl = document.getElementById("profile_username");
    if (usernameEl) {
        usernameEl.innerText = `Signed in as ${window.myIdentity}`;
    }

    loadMyBooks();
    loadMyReviews();
    loadMyReadingList();
    loadTaggedBooks();
    loadFriendLists();
}

/* -------------------- BOOKS I’VE POSTED -------------------- */
async function loadMyBooks() {
  const box = document.getElementById("profile_books");
  if (!box) return;
  box.innerText = "Loading…";

  try {
    const data = await fetchJSON("/api/v1/users/myBooks");
    const books = data.books || [];

    if (!books.length) {
      box.innerText = "You haven’t posted any books yet.";
      return;
    }

    const html = books.map((book) => renderBookCard(book)).join("\n");
    box.innerHTML = html;
  } catch (err) {
    console.error("Error loading my books:", err);
    box.innerText = "Error loading your posted books.";
  }
}

/* -------------------- REVIEWS I’VE WRITTEN -------------------- */
async function loadMyReviews() {
  const box = document.getElementById("profile_reviews");
  if (!box) return;
  box.innerText = "Loading…";

  try {
    const data = await fetchJSON("/api/v1/users/myReviews");
    const reviews = data.reviews || [];

    if (!reviews.length) {
      box.innerText = "You haven’t written any reviews yet.";
      return;
    }

    const html = reviews
      .map((r) => {
        const bookTitle = r.bookTitle || "(Unknown book)";
        const rating = r.ratingLevel != null ? `Rating: ${r.ratingLevel}` : "";
        const date = r.dateAdded
          ? new Date(r.dateAdded).toLocaleDateString()
          : "";
        const meta = [rating, date].filter(Boolean).join(" • ");

        return `
            <article class="review-card mb-3">
            <h4>${escapeHTML(r.bookTitle || "(Untitled)")}</h4>

            <p>${escapeHTML(r.textBody || "")}</p>

            <div class="text-muted" style="font-size:.9em;">
                Rating: ${r.ratingLevel ?? "N/A"} •
                ${r.dateAdded ? new Date(r.dateAdded).toLocaleDateString() : ""}
            </div>

            <button class="btn btn-sm btn-outline-danger"
                    onclick="deleteReview('${r._id}', this)">
                Delete Review
            </button>
            </article>
        `;
      })
      .join("\n");

    box.innerHTML = html;
  } catch (err) {
    console.error("Error loading my reviews:", err);
    box.innerText = "Error loading your reviews.";
  }
}

async function deleteReview(reviewId, btn) {
  if (!confirm("Delete this review?")) return;

  try {
    await fetchJSON(`/api/v1/reviews/${reviewId}`, {
      method: "DELETE",
    });

    const card = btn.closest(".review-card");
    if (card) card.remove();
  } 
  catch (err) {
    console.error("Error deleting review:", err);
    alert("Could not delete review.");
  }
}

/* -------------------- MY READING LIST -------------------- */
async function loadMyReadingList() {
  const box = document.getElementById("profile_reading_list");
  if (!box) return;

  box.innerText = "Loading…";

  try {
    const data = await fetchJSON("/api/v1/users/myReadingList");
    const books = data.books || [];

    if (!books.length) {
      box.innerText = "Your reading list is empty.";
      return;
    }

    const html = books
      .map((book) => renderReadingListCard(book))
      .join("");

    box.innerHTML = html;
  } catch (err) {
    console.error("Error loading my reading list:", err);
    box.innerText = "Error loading your reading list.";
  }
}


async function removeFromReadingList(bookId, btn) {
  try {
    await fetchJSON(`/api/v1/users/readingList/${bookId}`, {
      method: "DELETE",
    });

    if (btn) {
      // remove whole card, or just update button text
      const card = btn.closest(".book-card");
      if (card) card.remove();
    }
  } catch (err) {
    console.error("Error removing from reading list:", err);
    alert("Could not remove book from reading list.");
  }
}

// LOAD TAGGED BOOKS 
async function loadTaggedBooks() {
  const container = document.getElementById("tagged_books_box");
  container.innerHTML = "Loading tagged books...";

  try {
    const response = await fetch("/api/v1/users/myTaggedBooks");
    const data = await response.json();

    if (data.status !== "success") {
      container.innerHTML =
        `<div class="text-danger">Error loading tagged books: ${data.error || "unknown error"}</div>`;
      return;
    }

    const books = data.books || [];
    if (books.length === 0) {
      container.innerHTML = `<div class="text-muted">No books have been tagged for you yet.</div>`;
      return;
    }

    const list = document.createElement("ul");
    list.className = "list-group";

    for (const book of books) {
      const li = document.createElement("li");
      li.className = "list-group-item";

      // adjust fields to match book schema
      const title = book.title || "Untitled";
      const author = [
        book.authorFirstName,
        book.authorMiddleName,
        book.authorLastName,
      ]
        .filter(Boolean)
        .join(" ");

      li.innerHTML = `
        <div>
          <strong><a href="/book.html?id=${book._id}">${title}</a></strong>
          ${author ? `<div class="text-muted">${author}</div>` : ""}
        </div>
      `;

      list.appendChild(li);
    }

    container.innerHTML = "";
    container.appendChild(list);
  } catch (err) {
    console.error("Error loading tagged books", err);
    container.innerHTML =
      `<div class="text-danger">Error loading tagged books.</div>`;
  }
}

