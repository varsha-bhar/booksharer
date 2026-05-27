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
  loadFriendListsForSharing();
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
    const coverEl = document.getElementById("book_cover");

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

    document.getElementById("book_meta").innerHTML = metaParts
      .map((item) => `<span class="detail-meta-item">${escapeHTML(item)}</span>`)
      .join("");

    if (coverEl) {
      coverEl.src = getBookCoverUrl(book, "L");
      coverEl.alt = `Cover of ${book.title || "book"}`;
      coverEl.onerror = function handleCoverError() {
        this.src = "/images/no-cover.png";
      };
    }
  }
  catch (err) {
    console.log("Error loading book:", err);
    document.getElementById("book_title").innerText = "Error loading book details.";
  }
}

// LOAD REVIEWS | GET /api/v1/reviews?bookID=...
async function loadReviews() {
  const box = document.getElementById("reviews_box");
  box.innerHTML = `
    <div class="empty-state">
      <h3>Loading reviews</h3>
      <p>Gathering notes from readers now.</p>
    </div>
  `;

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
      box.innerHTML = `
        <div class="empty-state">
          <h3>No reviews yet</h3>
          <p>Be the first person to leave one for this book.</p>
        </div>
      `;
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
          <article class="review-card">
            <div class="review-inline">${parts.join(" • ")}</div>
          </article>
        `;
      })
      .join("\n");

    box.innerHTML = reviewsHtml;
  }
  catch (err) {
    console.log("Error loading reviews:", err);
    box.innerHTML = `
      <div class="empty-state">
        <h3>Couldn’t load reviews</h3>
        <p>Please refresh and try again.</p>
      </div>
    `;
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
  const msgEl = document.getElementById("book_add_message");

  if (!window.myIdentity) {
    showInlineSignInPrompt(
      msgEl,
      "Please sign in to save this book to your reading list.",
    );
    return;
  }

  if (msgEl) msgEl.innerText = "Adding...";

  try {
    await fetchJSON("/api/v1/users/readingList", {
      method: "POST",
      body: { bookId: currentBookId },
    });

    if (msgEl) msgEl.innerText = "Added to your reading list.";
  } catch (err) {
    console.error("Error adding current book to reading list:", err);
    const message = String(err.message || err);
    if (message.includes("Status: 401") || message.includes('"not logged in"')) {
      showInlineSignInPrompt(
        msgEl,
        "Please sign in to save this book to your reading list.",
      );
      return;
    }

    if (msgEl) msgEl.innerText = "Error adding to list.";
  }
}

async function loadFriendListsForSharing() {
  const selectEl = document.getElementById("friend_list_select");
  const msgEl = document.getElementById("share_book_message");

  if (!selectEl) {
    return;
  }

  if (!window.myIdentity) {
    selectEl.innerHTML = `<option value="">Sign in to load your friend lists</option>`;
    if (msgEl) {
      msgEl.innerHTML = "";
    }
    return;
  }

  selectEl.innerHTML = `<option value="">Loading friend lists...</option>`;

  try {
    const data = await fetchJSON("/api/v1/friends");
    const friendLists = data.friendLists || [];

    if (!friendLists.length) {
      selectEl.innerHTML = `<option value="">No friend lists yet</option>`;
      if (msgEl) {
        msgEl.textContent = "Create a friend list from your profile first.";
      }
      return;
    }

    const options = friendLists
      .map((list) => `<option value="${escapeHTML(list.id)}">${escapeHTML(list.name)}</option>`)
      .join("");

    selectEl.innerHTML = `
      <option value="">Choose a friend list</option>
      ${options}
    `;

    if (msgEl) {
      msgEl.textContent = "";
    }
  } catch (err) {
    console.error("Error loading friend lists for sharing:", err);
    selectEl.innerHTML = `<option value="">Could not load friend lists</option>`;
    if (msgEl) {
      msgEl.textContent = "Could not load friend lists.";
    }
  }
}

async function shareBookToFriendList() {
  const selectEl = document.getElementById("friend_list_select");
  const msgEl = document.getElementById("share_book_message");

  if (!window.myIdentity) {
    showInlineSignInPrompt(
      msgEl,
      "Please sign in to add this book to a friend list.",
    );
    return;
  }

  const listId = selectEl ? selectEl.value : "";
  const listLabel = selectEl && selectEl.selectedIndex >= 0
    ? selectEl.options[selectEl.selectedIndex].text
    : "";

  if (!listId) {
    if (msgEl) {
      msgEl.textContent = "Choose a friend list first.";
    }
    return;
  }

  if (msgEl) {
    msgEl.textContent = "Adding book to group...";
  }

  try {
    await fetchJSON(`/api/v1/friends/${encodeURIComponent(listId)}/books`, {
      method: "POST",
      body: { bookId: currentBookId },
    });

    if (msgEl) {
      msgEl.textContent = `Added to ${listLabel || "friend list"}.`;
    }
  } catch (err) {
    console.error("Error sharing book to friend list:", err);
    const message = String(err.message || err);
    if (message.includes("Status: 401") || message.includes('"not logged in"')) {
      showInlineSignInPrompt(
        msgEl,
        "Please sign in to add this book to a friend list.",
      );
      return;
    }

    if (msgEl) {
      msgEl.textContent = "Could not add this book to the friend list.";
    }
  }
}
