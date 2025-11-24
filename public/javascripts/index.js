// LOGIN
async function login(){
    let response = await fetch("/api/v1/users/login", {
        method: "POST"
    });

    let text = await response.text();
    document.getElementById("results").innerText = text;
}


// SEARCH BOOKS
async function searchBooks(){
    let query = document.getElementById("book_search_input").value;

    let response = await fetch("/api/v1/books?query=" + encodeURIComponent(query), {
        method: "GET"
    });

    let text = await response.text();
    document.getElementById("results").innerText = text;
}


// ADD BOOK
async function addBook(){
    let title = document.getElementById("add_book_title_input").value;
    let authorFirstName = document.getElementById("add_book_authorFirstName_input").value;
    let authorLastName = document.getElementById("add_book_authorLastName_input").value;
    let year = document.getElementById("add_book_year_input").value;

    let response = await fetch("/api/v1/books", {
        method: "POST",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            title: title,
            authorFirstName: authorFirstName,
            authorLastName: authorLastName,
            year: year
        })
    });

    let text = await response.text();
    document.getElementById("results").innerText = text;
}


// LOAD READING LIST
async function loadReadingList(){
    let username = "demoUser"; // PLACEHOLDER

    let response = await fetch(`/api/v1/users/${username}/readlist`, {
        method: "GET"
    });

    let text = await response.text();
    document.getElementById("results").innerText = text;
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
    document.getElementById("results").innerText = text;
}


// LOAD TAGGED BOOKS
async function loadTaggedBooks(){
    let username = "demoUser"; // PLACEHOLDER

    let response = await fetch(`/api/v1/users/${username}/taglist`, {
        method: "GET"
    });

    let text = await response.text();
    document.getElementById("results").innerText = text;
}


// CREATE / UPDATE FRIEND LIST
async function createFriendList(){
    let listName = document.getElementById("friend_list_name_input").value;

    let response = await fetch(`/api/v1/users/friends/${listName}`, {
        method: "POST",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            placeholder: "demo"
        })
    });

    let text = await response.text();
    document.getElementById("results").innerText = text;
}
