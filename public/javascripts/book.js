let currentBookId = null;

async function initBookPage() {
  // load current user identity (shows login/logout in navbar)
  if (typeof loadIdentity === "function") {
    await loadIdentity();
  }

  const params = new URLSearchParams(window.location.search);
  const queryId = params.get("id");

  if (queryId) {
    currentBookId = queryId;
  }
  else {
    const segments = window.location.pathname.split("/");
    currentBookId = segments.pop() || segments.pop(); // handle trailing slash
  }

  if (!currentBookId) {
    document.getElementById("book_title").innerText = "Book not found.";
    return;
  }

  loadBookDetails();
  loadReviews();
}

// LOAD BOOK DETAILS | GET /api/v1/books/:bookId
async function loadBookDetails() {
  try {
    const resp = await fetch(`/api/v1/books/${currentBookId}`);
    if (!resp.ok) {
      document.getElementById("book_title").innerText = "Error loading book details.";
      return;
    }

    const book = await resp.json();

    // Title
    document.getElementById("book_title").innerText =
      book.title || "(Untitled)";

    // Author
    let author = '';

    if (book.authorFirstName && book.authorMiddleName && book.authorLastName) {
      author = [
      book.authorFirstName,
      book.authorMiddleName,
      book.authorLastName,
    ]
      .filter(Boolean)
      .join(" ");
    } else if (book.authorName) {
      author = book.authorName;
    }

    document.getElementById("book_author").innerText = author
      ? `Author: ${author}`
      : "Author: Unknown";

    // Metadata
    const metaParts = [];
    if (book.year) metaParts.push(`Year: ${book.year}`);
    if (book.ISBN) metaParts.push(`ISBN: ${book.ISBN}`);
    if (book.publisher) metaParts.push(`Publisher: ${book.publisher}`);

    document.getElementById("book_meta").innerText = metaParts.join(" • ");
  }
  catch (err) {
    console.log("Error loading book:", err);
    document.getElementById("book_title").innerText = "Error loading book details.";
  }
}

// LOAD REVIEWS | GET /api/v1/reviews?bookID=...
async function loadReviews() {
  const box = document.getElementById("reviews_box");
  box.innerHTML = "Loading reviews...";

  try {
    const resp = await fetch(
      `/api/v1/reviews?bookID=${encodeURIComponent(currentBookId)}`
    );

    if (!resp.ok) {
      box.innerText = "Error loading reviews.";
      return;
    }

    const reviews = await resp.json();

    if (!Array.isArray(reviews) || reviews.length === 0) {
      box.innerText = "No reviews yet.";
      return;
    }

    const reviewsHtml = reviews
      .map((review) => {
        const username =
          review.noteByUser && review.noteByUser.username
            ? review.noteByUser.username
            : "Anonymous";

        const parts = [];
        const safeUser = escapeHTML(username);
        const userHtml =
            username === "Anonymous"
                ? safeUser
                : `<a href="/profile.html">${safeUser}</a>`;

        parts.push(`<strong>${userHtml}</strong>`);

        if (review.textBody) {
          parts.push(escapeHTML(review.textBody));
        }

        if (
          review.ratingLevel !== null &&
          review.ratingLevel !== undefined
        ) {
          parts.push(`Rating: ${review.ratingLevel}`);
        }

        if (review.dateAdded) {
          const d = new Date(review.dateAdded).toLocaleDateString();
          parts.push(`Date: ${d}`);
        }

        return `
          <div class="review-card">
            ${parts.join(" • ")}
          </div>
        `;
      })
      .join("\n");

    box.innerHTML = reviewsHtml;
  }
  catch (err) {
    console.log("Error loading reviews:", err);
    box.innerText = "Error loading reviews.";
  }
}

// ADD REVIEW | POST /api/v1/reviews
async function addReview() {
  const textEl = document.getElementById("new_review_text");
  const ratingEl = document.getElementById("new_review_rating");
  const msgEl = document.getElementById("add_review_message");
  // for tagging feature specifically
  const tagsEl = document.getElementById("new_review_tags");


  const textBody = textEl.value.trim();
  const ratingValue = ratingEl.value;
  // CSV style usernames for tagging
  const tagsInput = tagsEl ? tagsEl.value : "";
  msgEl.innerText = "";

  if (!textBody && !ratingValue) {
    msgEl.innerText = "Please enter a review or rating.";
    return;
  }

  try {
    const resp = await fetch(`/api/v1/books/${currentBookId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        textBody,
        taggedUsernames: tagsInput,
        ratingLevel: ratingValue ? Number(ratingValue) : null,
      })
    });


  // try {
  //   const resp = await fetch("/api/v1/reviews", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       bookID: currentBookId,
  //       textBody,
  //       taggedUsernames: tagsInput,
  //       ratingLevel: ratingValue ? Number(ratingValue) : null,
  //     }),
  //   });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok || data.status === "error") {
      msgEl.innerText = data.error || "Error adding review.";
      return;
    }

    msgEl.innerText = "Review added.";
    textEl.value = "";
    ratingEl.value = "";
    if (tagsEl) tagsEl.value = "";


    loadReviews();
  }
  catch (err) {
    console.log("Error adding review:", err);
    msgEl.innerText = "Error adding review.";
  }
}

async function addCurrentBookToList() {
  if (!window.myIdentity) {
    alert("Please sign in to add books to your reading list.");
    return;
  }

  const msgEl = document.getElementById("book_add_message");
  if (msgEl) msgEl.innerText = "Adding...";

  try {
    await fetchJSON("/api/v1/users/readingList", {
      method: "POST",
      body: { bookId: currentBookId },
    });

    if (msgEl) msgEl.innerText = "Added to your reading list.";
  } catch (err) {
    console.error("Error adding current book to reading list:", err);
    if (msgEl) msgEl.innerText = "Error adding to list.";
  }
}
