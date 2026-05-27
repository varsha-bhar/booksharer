function getFriendListsContainer() {
  return document.getElementById("groups_content") || document.getElementById("profile_friends");
}

function isGroupsPage() {
  return Boolean(document.getElementById("groups_content"));
}

function openGroupPage(listRef) {
  window.location.href = `/groups.html?group=${encodeURIComponent(listRef)}`;
}

function goToGroupsIndex() {
  if (isGroupsPage()) {
    window.location.href = "/groups.html";
    return;
  }

  loadFriendLists();
}

function handleGroupCardKeydown(event, listRef) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  openGroupPage(listRef);
}

async function loadFriendLists() {
    const box = getFriendListsContainer();
    if (!box) return;
    box.innerText = "Loading…";
  
    try {
      const data = await fetchJSON("/api/v1/friends");
      const friendLists = data.friendLists || [];

      const groupsSubtitle = document.getElementById("groups_page_subtitle");
      if (groupsSubtitle) {
        groupsSubtitle.innerText = friendLists.length
          ? "Open a group to see its members and every book shared inside it."
          : "Create your first group to start organizing recommendations.";
      }
  
      if (!friendLists.length) {
        box.innerHTML = `
          <div class="empty-state">
            <h3>No friend lists yet</h3>
            <p>Create your first group to organize who should see which recommendations.</p>
            <div class="section-actions justify-content-center mt-3">
              <button class="btn btn-primary" onclick="showCreateFriendListForm()">
                Create Friend List
              </button>
            </div>
          </div>
        `;
        return;
      }
  
      let html = `
        <button class="btn btn-primary mb-3" onclick="showCreateFriendListForm()">
          Create New Friend List
        </button>
        <div id="friend_lists_container">
      `;
  
      friendLists.forEach(list => {
        html += `
          <div
            class="card mb-3 book-card-clickable"
            onclick="openGroupPage('${list.id}')"
            tabindex="0"
            role="link"
            onkeydown="handleGroupCardKeydown(event, '${list.id}')"
          >
            <div class="card-body">
              <h5 class="card-title">${escapeHTML(list.name)}</h5>
              <p class="card-text text-muted">${escapeHTML(list.description || 'No description')}</p>
              <p class="text-muted">Members: ${list.memberCount}</p>
              <p class="text-muted">Books shared: ${list.sharedBookCount || 0}</p>
              <div class="book-actions mt-3">
                <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); openGroupPage('${list.id}')">
                  Open Group
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteFriendList('${list.id}', '${escapeHTML(list.name)}')">
                  Delete
                </button>
              </div>
            </div>
          </div>
        `;
      });
  
      html += `</div>`;
      box.innerHTML = html;
  
    } catch (err) {
      console.error("Error loading friend lists:", err);
      box.innerHTML = `
        <div class="empty-state">
          <h3>Couldn’t load friend lists</h3>
          <p>Please try again, or create a new list if you’re just getting started.</p>
          <div class="section-actions justify-content-center mt-3">
            <button class="btn btn-primary" onclick="showCreateFriendListForm()">
              Create Friend List
            </button>
          </div>
        </div>
      `;
    }
  }
  
  function showCreateFriendListForm() {
    const box = getFriendListsContainer();
    if (!box) return;
  
    box.innerHTML = `
      <div class="card">
        <div class="card-body">
          <h5 class="card-title">Create New Friend List</h5>
          <form onsubmit="createFriendList(event)">
            <div class="mb-3">
              <label class="form-label">List Name:</label>
              <input 
                type="text" 
                id="new_list_name" 
                class="form-control" 
                placeholder="e.g., book-club, close-friends"
                required
              />
            </div>
            <div class="mb-3">
              <label class="form-label">Description:</label>
              <input 
                type="text" 
                id="new_list_description" 
                class="form-control" 
                placeholder="e.g., My book club members"
              />
            </div>
            <button type="submit" class="btn btn-success">Create</button>
            <button type="button" class="btn btn-secondary" onclick="loadFriendLists()">Cancel</button>
          </form>
        </div>
      </div>
    `;
  }
  
  async function createFriendList(event) {
    event.preventDefault();
  
    const name = document.getElementById("new_list_name").value.trim();
  const description = document.getElementById("new_list_description").value.trim();
  
  if (!name) {
      showSiteNotice("Please enter a list name.", { tone: "warning" });
      return;
  }
  
    try {
      await fetchJSON(`/api/v1/friends/${encodeURIComponent(name)}`, {
        method: "POST",
        body: { description }
      });
  
      showSiteNotice("Friend list created.", { tone: "success" });
      if (isGroupsPage()) {
        openGroupPage(name);
        return;
      }
      loadFriendLists();
  
    } catch (err) {
      console.error("Error creating friend list:", err);
      showSiteNotice(`Could not create friend list. ${err.message || ""}`.trim(), { tone: "error" });
    }
  }
  
  async function viewFriendList(listRef) {
    try {
      const data = await fetchJSON(`/api/v1/friends/${encodeURIComponent(listRef)}`);
      const list = data.friendList;
  
      let membersHtml = "";
      if (list.members && list.members.length > 0) {
        membersHtml = list.members.map(member => `
          <li class="list-group-item">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                ${escapeHTML(member.displayName || member.username)}
                <br>
                <span class="text-muted small">${escapeHTML(member.username)}</span>
              </div>
              <button class="btn btn-sm btn-outline-danger" 
                      onclick="removeMemberFromList('${list.id}', '${member._id}')">
                Remove
              </button>
            </div>
          </li>
        `).join("");
      } else {
        membersHtml = '<li class="list-group-item text-muted">No members yet</li>';
      }

      let sharedBooksHtml = "";
      if (list.sharedBooks && list.sharedBooks.length > 0) {
        sharedBooksHtml = list.sharedBooks.map((book) => `
          <li class="list-group-item">
            <div class="d-flex justify-content-between align-items-center gap-3">
              <div>
                <strong><a href="/book/${book._id}">${escapeHTML(book.title || "Untitled")}</a></strong>
                <div class="text-muted small">
                  ${escapeHTML(book.authorName || "Author unknown")}
                  ${book.year ? ` • ${escapeHTML(String(book.year))}` : ""}
                </div>
              </div>
              <button class="btn btn-sm btn-outline-danger"
                      onclick="removeBookFromList('${list.id}', '${book._id}')">
                Remove
              </button>
            </div>
          </li>
        `).join("");
      } else {
        sharedBooksHtml = '<li class="list-group-item text-muted">No books shared with this group yet</li>';
      }
  
      const box = getFriendListsContainer();
      const groupsSubtitle = document.getElementById("groups_page_subtitle");
      if (groupsSubtitle) {
        groupsSubtitle.innerText = `Group details for ${list.name}`;
      }
      box.innerHTML = `
        <div class="group-detail-card">
          <div class="group-detail-header">
            <div>
              <h3 class="group-detail-title">${escapeHTML(list.name)}</h3>
              <p class="group-detail-description">${escapeHTML(list.description || "No description")}</p>
            </div>
          </div>

          <section class="group-detail-section">
            <div class="group-detail-section-head">
              <h4>Members</h4>
              <span>${list.memberCount}</span>
            </div>
            <ul class="list-group group-list">
              ${membersHtml}
            </ul>
          </section>

          <section class="group-detail-section">
            <div class="group-detail-section-head">
              <h4>Shared books</h4>
              <span>${(list.sharedBooks || []).length}</span>
            </div>
            <ul class="list-group group-list">
              ${sharedBooksHtml}
            </ul>

          <section class="group-detail-section">
            <div class="group-detail-section-head">
              <h4>Add member</h4>
            </div>
            <form onsubmit="addMemberToList(event, '${list.id}')" class="group-member-form">
              <div class="group-member-row">
                <input 
                  type="text" 
                  id="member_username_input" 
                  class="form-control" 
                  placeholder="Enter username"
                  required
                />
                <button type="submit" class="btn btn-primary">Add</button>
              </div>
            </form>
          </section>

          <div class="section-actions mt-4">
            <button class="btn btn-secondary" onclick="goToGroupsIndex()">Back to All Groups</button>
          </div>
        </div>
      `;
  
    } catch (err) {
      console.error("Error viewing friend list:", err);
      showSiteNotice("Could not load friend list details.", { tone: "error" });
    }
  }

  async function initGroupsPage() {
    if (typeof loadIdentity === "function") {
      await loadIdentity();
    }

    if (!window.myIdentity) {
      const groupsContent = document.getElementById("groups_content");
      const groupsSubtitle = document.getElementById("groups_page_subtitle");
      if (groupsSubtitle) {
        groupsSubtitle.innerText = "Sign in to open your groups.";
      }
      if (groupsContent) {
        groupsContent.innerHTML = `
          <div class="empty-state">
            <h3>Sign in to view your groups</h3>
            <p>Your friend lists and shared books will appear here after you log in.</p>
            <div class="section-actions justify-content-center mt-3">
              <a href="/signin" class="btn btn-primary">Log in with UW</a>
            </div>
          </div>
        `;
      }
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const groupRef = params.get("group");

    if (groupRef) {
      await viewFriendList(groupRef);
      return;
    }

    await loadFriendLists();
  }
  
  async function deleteFriendList(listRef, listName) {
    const confirmed = await confirmInPage({
      title: "Delete friend list?",
      message: `Delete friend list "${listName}"?`,
      confirmLabel: "Delete list",
      confirmClass: "btn btn-danger",
    });
    if (!confirmed) return;
  
    try {
      await fetchJSON(`/api/v1/friends/${encodeURIComponent(listRef)}`, {
        method: "DELETE"
      });
  
      showSiteNotice("Friend list deleted.", { tone: "success" });
      loadFriendLists();
  
    } catch (err) {
      console.error("Error deleting friend list:", err);
      showSiteNotice("Could not delete friend list.", { tone: "error" });
    }
  }
  
  async function addMemberToList(event, listRef) {
    event.preventDefault();
    
    const username = document.getElementById("member_username_input").value.trim();
    
    if (!username) {
      showSiteNotice("Please enter a username.", { tone: "warning" });
      return;
    }
  
    try {
      const usersResponse = await fetchJSON("/api/v1/users");
      const users = usersResponse || [];
      const user = users.find(u => u.username === username);
      
      if (!user) {
        showSiteNotice("User not found.", { tone: "warning" });
        return;
      }
  

      await fetchJSON(`/api/v1/friends/${encodeURIComponent(listRef)}/members`, {
        method: "POST",
        body: { userId: user._id }
      });
  
      showSiteNotice("Member added.", { tone: "success" });
      viewFriendList(listRef); 

    } catch (err) {
      console.error("Error adding member:", err);
      showSiteNotice(`Could not add member. ${err.message || ""}`.trim(), { tone: "error" });
    }
  }
  
  async function removeMemberFromList(listRef, userId) {
    const confirmed = await confirmInPage({
      title: "Remove member?",
      message: "Remove this member from the list?",
      confirmLabel: "Remove member",
      confirmClass: "btn btn-danger",
    });
    if (!confirmed) return;
  
    try {
      await fetchJSON(`/api/v1/friends/${encodeURIComponent(listRef)}/members/${userId}`, {
        method: "DELETE"
      });
  
      showSiteNotice("Member removed.", { tone: "success" });
      viewFriendList(listRef);
  
    } catch (err) {
      console.error("Error removing member:", err);
      showSiteNotice("Could not remove member.", { tone: "error" });
    }
  }

  async function removeBookFromList(listRef, bookId) {
    const confirmed = await confirmInPage({
      title: "Remove book from group?",
      message: "This will remove the book from this friend list.",
      confirmLabel: "Remove book",
      confirmClass: "btn btn-danger",
    });
    if (!confirmed) return;

    try {
      await fetchJSON(`/api/v1/friends/${encodeURIComponent(listRef)}/books/${bookId}`, {
        method: "DELETE"
      });

      showSiteNotice("Book removed from friend list.", { tone: "success" });
      viewFriendList(listRef);

    } catch (err) {
      console.error("Error removing book from friend list:", err);
      showSiteNotice("Could not remove book from friend list.", { tone: "error" });
    }
  }
