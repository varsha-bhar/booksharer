async function loadFriendLists() {
    const box = document.getElementById("profile_friends");
    if (!box) return;
    box.innerText = "Loading…";
  
    try {
      const data = await fetchJSON("/api/v1/friends");
      const friendLists = data.friendLists || [];
  
      if (!friendLists.length) {
        box.innerHTML = `
          <p class="text-muted">You haven't created any friend lists yet.</p>
          <button class="btn btn-primary" onclick="showCreateFriendListForm()">
            Create Friend List
          </button>
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
          <div class="card mb-3">
            <div class="card-body">
              <h5 class="card-title">${escapeHTML(list.name)}</h5>
              <p class="card-text text-muted">${escapeHTML(list.description || 'No description')}</p>
              <p class="text-muted">Members: ${list.memberCount}</p>
              <button class="btn btn-sm btn-outline-primary" onclick="viewFriendList('${escapeHTML(list.name)}')">
                View Members
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteFriendList('${escapeHTML(list.name)}')">
                Delete
              </button>
            </div>
          </div>
        `;
      });
  
      html += `</div>`;
      box.innerHTML = html;
  
    } catch (err) {
      console.error("Error loading friend lists:", err);
      box.innerHTML = `
        <p class="text-danger">Error loading friend lists.</p>
        <button class="btn btn-primary" onclick="showCreateFriendListForm()">
          Create Friend List
        </button>
      `;
    }
  }
  
  function showCreateFriendListForm() {
    const box = document.getElementById("profile_friends");
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
      alert("Please enter a list name");
      return;
    }
  
    try {
      await fetchJSON(`/api/v1/friends/${encodeURIComponent(name)}`, {
        method: "POST",
        body: { description }
      });
  
      alert("Friend list created!");
      loadFriendLists();
  
    } catch (err) {
      console.error("Error creating friend list:", err);
      alert("Could not create friend list. " + (err.message || ""));
    }
  }
  
  async function viewFriendList(listName) {
    try {
      const data = await fetchJSON(`/api/v1/friends/${encodeURIComponent(listName)}`);
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
                      onclick="removeMemberFromList('${escapeHTML(listName)}', '${member._id}')">
                Remove
              </button>
            </div>
          </li>
        `).join("");
      } else {
        membersHtml = '<li class="list-group-item text-muted">No members yet</li>';
      }
  
      const box = document.getElementById("profile_friends");
      box.innerHTML = `
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">${escapeHTML(list.name)}</h5>
            <p class="card-text text-muted">${escapeHTML(list.description || 'No description')}</p>
            <h6>Members (${list.memberCount}):</h6>
            <ul class="list-group mb-3">
              ${membersHtml}
            </ul>
            
            <!-- ADD MEMBER FORM -->
            <div class="mb-3">
              <h6>Add Member</h6>
              <form onsubmit="addMemberToList(event, '${escapeHTML(listName)}')">
                <div class="input-group">
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
            </div>
            
            <button class="btn btn-secondary" onclick="loadFriendLists()">Back to All Lists</button>
          </div>
        </div>
      `;
  
    } catch (err) {
      console.error("Error viewing friend list:", err);
      alert("Could not load friend list details.");
    }
  }
  
  async function deleteFriendList(listName) {
    if (!confirm(`Delete friend list "${listName}"?`)) return;
  
    try {
      await fetchJSON(`/api/v1/friends/${encodeURIComponent(listName)}`, {
        method: "DELETE"
      });
  
      alert("Friend list deleted!");
      loadFriendLists();
  
    } catch (err) {
      console.error("Error deleting friend list:", err);
      alert("Could not delete friend list.");
    }
  }
  
  async function addMemberToList(event, listName) {
    event.preventDefault();
    
    const username = document.getElementById("member_username_input").value.trim();
    
    if (!username) {
      alert("Please enter a username");
      return;
    }
  
    try {
      const usersResponse = await fetchJSON("/api/v1/users");
      const users = usersResponse || [];
      const user = users.find(u => u.username === username);
      
      if (!user) {
        alert("User not found");
        return;
      }
  

      await fetchJSON(`/api/v1/friends/${encodeURIComponent(listName)}/members`, {
        method: "POST",
        body: { userId: user._id }
      });
  
      alert("Member added!");
      viewFriendList(listName); 

    } catch (err) {
      console.error("Error adding member:", err);
      alert("Could not add member. " + (err.message || ""));
    }
  }
  
  async function removeMemberFromList(listName, userId) {
    if (!confirm("Remove this member from the list?")) return;
  
    try {
      await fetchJSON(`/api/v1/friends/${encodeURIComponent(listName)}/members/${userId}`, {
        method: "DELETE"
      });
  
      alert("Member removed!");
      viewFriendList(listName);
  
    } catch (err) {
      console.error("Error removing member:", err);
      alert("Could not remove member.");
    }
  }