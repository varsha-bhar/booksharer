// Very simple skeleton – you will replace this with real fetch() calls later.

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("search_books_button").onclick = () => {
    // TODO: call GET /books with query params
    document.getElementById("search_results").innerText = "Search results will go here.";
  };

  document.getElementById("add_book_button").onclick = () => {
    // TODO: call POST /books
    document.getElementById("add_book_message").innerText = "Book submitted (placeholder).";
  };

  document.getElementById("load_reading_list_button").onclick = () => {
    // TODO: call GET /users/{username}/readlist
    document.getElementById("reading_list_div").innerText = "Your reading list will appear here.";
  };

  document.getElementById("add_note_button").onclick = () => {
    // TODO: call POST /books/{bookid}/notes
    document.getElementById("note_message").innerText = "Review submitted (placeholder).";
  };

  document.getElementById("load_notes_button").onclick = () => {
    // TODO: call GET /books/{bookid}/notes
    document.getElementById("notes_list_div").innerText = "Reviews for this book will appear here.";
  };

  document.getElementById("load_tagged_books_button").onclick = () => {
    // TODO: call GET /users/{username}/taglist
    document.getElementById("tagged_books_div").innerText = "Tagged books will appear here.";
  };

  document.getElementById("create_friend_list_button").onclick = () => {
    // TODO: call POST /users/friends/{listname}
    document.getElementById("friend_lists_div").innerText = "Friend lists will appear here.";
  };
});
