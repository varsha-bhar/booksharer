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
    <article class="book-card book-card-compact">
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
        <div class="book-actions">
          ${linkHtml}
        </div>
      </div>
    </article>
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
    <article class="book-card book-card-compact">
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
        <div class="book-actions">
          ${linkHtml}
          <button class="btn btn-sm btn-outline-danger"
            onclick="removeFromReadingList('${book._id}', this)">
            Remove from list
          </button>
        </div>
      </div>
    </article>
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
                <section class="section-card">
                  <h1 class="section-title">My Profile</h1>
                  <p class="section-subtitle mt-3">Please sign in to view your profile.</p>
                </section>
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
      box.innerHTML = `
        <div class="empty-state">
          <h3>No posted books yet</h3>
          <p>Your shared titles will appear here.</p>
        </div>
      `;
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
      box.innerHTML = `
        <div class="empty-state">
          <h3>No reviews yet</h3>
          <p>Your written reviews will show up here once you post them.</p>
        </div>
      `;
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
            <article class="review-card">
            <h4>${escapeHTML(r.bookTitle || "(Untitled)")}</h4>

            <p class="review-body">${escapeHTML(r.textBody || "")}</p>

            <div class="review-meta">
                Rating: ${r.ratingLevel ?? "N/A"} •
                ${r.dateAdded ? new Date(r.dateAdded).toLocaleDateString() : ""}
            </div>

            <div class="book-actions mt-3">
              <button class="btn btn-sm btn-outline-danger"
                      onclick="deleteReview('${r._id}', this)">
                  Delete Review
              </button>
            </div>
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
      box.innerHTML = `
        <div class="empty-state">
          <h3>Your reading list is empty</h3>
          <p>Save books from the library to keep them handy here.</p>
        </div>
      `;
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
  container.innerHTML = `
    <div class="empty-state">
      <h3>Loading tagged books</h3>
      <p>Checking recommendations that were shared with you.</p>
    </div>
  `;

  try {
    const response = await fetch("/api/v1/users/myTaggedBooks");
    const data = await response.json();

    if (data.status !== "success") {
      container.innerHTML =
        `<div class="empty-state"><h3>Couldn’t load tagged books</h3><p>${escapeHTML(data.error || "Unknown error")}</p></div>`;
      return;
    }

    const books = data.books || [];
    if (books.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Nothing tagged yet</h3>
          <p>Books your friends recommend directly to you will appear here.</p>
        </div>
      `;
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
      `<div class="empty-state"><h3>Couldn’t load tagged books</h3><p>Please try again in a moment.</p></div>`;
  }
}
