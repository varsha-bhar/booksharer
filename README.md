# Info 441 Final Project - Group 6
Chris Hunter, Kevin Chuang, Arkita Jain, Varsha Bharath

## Introduction
Our group is going to create a social network site for sharing information about books with select audiences. Book data will be public but users will be able to set their own limits on who sees their reading lists, comments, or reviews. Users will be able to share books and tag others who might be interested in a specific book.

## Project Description
### Who is our target audience?
Our application is designed for book enthusiasts, particularly college students and young adults, who enjoy sharing their thoughts, opinions, and recommendations about what they read. Many people in this audience already engage with social platforms or group chats to discuss books informally, but there isn’t always a dedicated, safe space to connect with trusted peers over shared reading interests. Our app aims to fill that gap by allowing users to review books, preview details, and engage within a private network. We also envision our application appealing to small reading groups, classrooms, and book clubs that want to create private communities for discussions. These users value privacy, connection, and a space tailored specifically for book-related content rather than the noise of general social media.


### Why does your audience want to use your application?
Our audience wants a platform that lets them share book reviews and recommendations without the pressure of posting publicly or being judged by strangers. More specifically, being able to connect with trusted circles and discuss books with select friends or classmates through a private network would appeal to that need. They can also discover and preview new books, get summaries, links to pages like Amazon, and direct recommendations from peers they trust. Lastly, they can engage interactively with these posts by tagging people, commenting on reviews, and receiving notifications that create a collaborative reading environment.  Unlike large review platforms that are open to everyone, our app focuses on smaller, meaningful communities. It gives users control over who sees their content, encouraging honest opinions and authentic conversations.


### Why do you as developers want to build this application?
As developers, we’re inspired to create an application that makes reading a more social and connected experience. We’ve noticed that while many people love to read, conversations about books often get lost across different platforms—whether it’s short comments on social media, scattered group messages, or brief mentions in class. We wanted to design a space that brings these interactions together in a more intentional, community-driven way. Building this application allows us to combine our interest in technology with our shared passion for storytelling, learning, and social connection. We’re especially interested in how technology can foster meaningful discussion rather than shallow engagement. Features like private networks, tagging, and personalized notifications help us explore how online spaces can still feel authentic and secure. Ultimately, we want to create something that encourages people to reflect, share ideas, and connect through reading. By developing this platform, we hope to strengthen our own skills in web development, user experience design, and database integration—while also building a tool that helps people form closer, more thoughtful reading communities.


## Technical Description
Architectural Diagram


<img width="545" height="685" alt="Screenshot 2025-11-03 at 3 39 14 PM" src="https://github.com/user-attachments/assets/1c100197-5661-4ee9-81e5-ca3bc7056888" />


## User Stories

| Priority | User | Description | Technical Implementation |
|----------|------|-------------|--------------------------|
| P0 | As a new user | I want to be able to register for an account on the tool, in order to catalog and share books I like with others | New users can sign up for an account via a web form. Authentication will use an existing **OAuth** mechanism. |
| P0 | As a user | I want to be able to search for books | Books will be in a **MongoDB database**. Users can search using the **GET /books** endpoint. |
| P0 | As a user | I want to add books | If a book doesn't have an entry, it can be created using **POST /books** endpoint to add to the global database. |
| P1 | As a user | I want to be able to search for books | Users can search for a book title and add it to their collection using **GET /books** with query parameters. |
| P1 | As a user | I want to be able to add books I've read to my profile, in order to share my reading list with other people I know | Each user's reading list will be stored as a separate collection in **MongoDB**, associated with their account object. Uses **POST /users/{username}/readlist**. |
| P1 | As a user | I want to be able to delete a review/book | Users can delete previously made reviews on books using **DELETE /users/{username}/readlist** endpoint. |
| P1 | As a user | I want to be able to filter who my reviews are visible to | Permissions can be set on notes using the **friend list** feature. Notes will have a visibility field stored in **MongoDB** that filters who they are visible to. |
| P1 | As a user | I want to be able to leave reviews/comments for books I have read, in order to help others evaluate if a book is for them | Users can write notes for books through a web interface using **POST /books/{bookid}/notes**. Each review will be stored in **MongoDB** as an entry in a list tied to the book entry. |
| P1 | As a user | I want to be able to tag a book for specific people I know, to help them find books they might like | Users can select members of their friends to 'tag' a book for using **POST /users/{username}/taglist**. |
| P1 | As a user | I want to receive notifications | Tags will send a notification via **WebSocket** to those users that they have a book recommendation, which will be viewable from their dashboard. Notifications stored in **MongoDB**. |
| P1 | As a user | I want books to be recommended to me | Recommended books will be stored as an additional object list in **MongoDB** associated with each user, accessible via **GET /users/{username}/taglist**. |

## API Endpoints

| | Endpoint | Method | Description |
|---|---------|--------|-------------|
| |`/users/login` | POST | Authenticate user |
| |`/users/register` | POST | Create a new account |
|√|`/books` | GET | Search for books |
| |`/books/search` | GET | Search for specific books |
|√|`/books` | POST | Add a new book to the global database |
|√|`/books/{bookid}` | GET | Retrieve information for a specific book |
|√|`/books/{bookid}/notes` | POST | Add a note to a book |
|√|`/books/{bookid}/notes` | GET | Retrieve all notes for a specific book |
|√|`/reviews`| GET | Retrieve all notes
|√|`/reviews/{reviewId}` | GET | Retrieve a specific note
| |`/reviews/search` | GET | Retrieve specific notes
|√|`/users` | GET | Retrieve all users
| |`/users/{username}` | GET | Retrieve a specific user
| |`/users/{username}/readlist` | POST | Add a book to a user's reading list |
|√|`/users/{username}/readlist` | GET | Retrieve a user's reading list |
| |`/users/{username}/readlist/{bookid}` | DELETE | Delete book(s) from a reading list |
| |`/users/{username}/taglist` | POST | Tag a book for another user |
|√|`/users/{username}/taglist` | GET | Retrieve all tagged books for a user |
| |`/users/friends/{listname}` | POST | Create or update a friend list |
| |`/users/friends/{listname}` | GET | Retrieve members of a specific friend list |



## Data Schemas
- User
  - username
  - displayName
  - readList [Books]
  - tagList [TagEntry]
  - friendLists [FriendList]

- Book
  - ISBN
  - title
  - authorFirstName
  - authorMiddeName
  - authorLastName
  - year
  - publisher
  - edition
  - noteList [NoteEntry]
  - addedByUser ref: User

- NoteEntry
  - noteByUser ref: User
  - textBody
  - ratingLevel
  - likes [User]
  - visibleTo [frindList]
  - dateAdded

- TagEntry
  - taggedByUser ref: User
  - tagNoteText
  - dateAdded

- FriendList
  - friendListOwnerId ref: User
  - friendListName
  - friendListDesc
  - listPrivacyInfo
  - listMembers [User]





## Data Flow Architectural Diagram

<img width="700" height="500" alt="Screenshot 2025-11-06 at 11 03 16 PM" src="https://github.com/user-attachments/assets/08b4b0d8-a22c-4c70-9fa7-2e0f2b0c3429" />



## System Components

Client:
- Browser-based interface (via React)
- Sends/receives data through REST API requests
- Handles login via OAuth redirect flow

Server:
- Node.js + Express backend that exposes /users, /books, /notes, and /friends endpoints
- Manages authentication, routing, and other logic
- Handles notifications using WebSockets for real-time updates (e.g., when someone tags you)

Database:
- MongoDB stores:- users, books, notes, tags, friendLists
- Stores reading lists, book data, notes, tags, and user relationships


## Flow of Data

1. User Registration/Login
- User signs up or logs in through OAuth 2.0 (/users/register, /users/login).
- Server validates and stores new user entry in users.

2. Book Search & Add
- Client sends GET /books to find or POST /books to add a new entry.
- Server queries or inserts to the books collection in MongoDB.

3. Reading List / Notes / Tags
- POST /users/{username}/readlist updates user’s personal readList.
- POST /books/{bookid}/notes adds a noteList entry to that book.
- POST /users/{username}/taglist creates a tag and sends a real-time notification.

4. Friend Lists
- POST /users/friends/{listname} creates private sharing groups.
- GET /users/friends/{listname} retrieves members for access control.


## Communication Types
Client ↔ Server: REST API over HTTPS (JSON)
Client ↔ Authentication Provider: OAuth 2.0
Server ↔ Database: MongoDB
Server → Client: Websocket
