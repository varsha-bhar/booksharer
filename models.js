import mongoose from 'mongoose'

// models will have my db collection connections
const models = {}

console.log("connecting to mongodb");

await mongoose.connect(
  "mongodb+srv://bookItemsUser:6aa6fe87152a88cec285c073f36842d6@cluster0.tit8bph.mongodb.net/bookItems?retryWrites=true&w=majority&appName=Cluster0"
);

console.log("successfully connected to mongodb!");
const userSchema = new mongoose.Schema({
    username: String,
    displayName: String,
    readList: [{type: mongoose.Schema.Types.ObjectId, ref:"Book"}],
    tagList: [{type: mongoose.Schema.Types.ObjectId, ref:"TagEntry"}],
    friendLists: [{type: mongoose.Schema.Types.ObjectId, ref:"FriendList"}]
});
models.User= mongoose.model("User", userSchema);


const bookSchema = new mongoose.Schema({
    ISBN: String,
    title: String,
    authorName: String,
    authorFirstName: String,
    authorMiddleName: String,
    authorLastName: String,
    year: Number,
    publisher: String,
    edition: String,
    noteList: [{ type: mongoose.Schema.Types.ObjectId, ref: "NoteEntry" }],
    addedByUser: {type: mongoose.Schema.Types.ObjectId, ref:"User"}
});
models.Book = mongoose.model("Book", bookSchema);


const noteEntrySchema = new mongoose.Schema({
    noteByUser: {type: mongoose.Schema.Types.ObjectId, ref:"User"},
    textBody: String,
    ratingLevel: Number,
    likes: [{type: mongoose.Schema.Types.ObjectId, ref:"User"}],
    visibleTo: [{type: mongoose.Schema.Types.ObjectId, ref:"FriendList"}],
    dateAdded: Date,
    // FOR TAGGING FEATURE
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
    taggedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});
models.NoteEntry = mongoose.model("NoteEntry", noteEntrySchema);


const tagEntrySchema = new mongoose.Schema({
    taggedByUser: {type: mongoose.Schema.Types.ObjectId, ref:"User"},
    tagNoteText: String,
    dateAdded: Date
});
models.TagEntry = mongoose.model("TagEntry", tagEntrySchema);


const friendListSchema = new mongoose.Schema({
    friendListOwnerId: {type: mongoose.Schema.Types.ObjectId, ref:"User"},
    friendListName: String,
    friendListDesc: String,
    listPrivacyInfo: String,
    listMembers: [{type: mongoose.Schema.Types.ObjectId, ref:"User"}],
});
models.FriendList = mongoose.model("FriendList", friendListSchema);

console.log('mongoose bookitems models created');

export default models;
