let myIdentity = undefined;  // global used by other scripts

async function loadIdentity() {
  const identity_div = document.getElementById("identity_div");
  const signedInOnlyNavLinks = document.querySelectorAll(".nav-link-signed-in-only");

  try {
    const identityInfo = await fetchJSON("/api/v1/users/myIdentity");

    if (identityInfo.status === "loggedin") {
      const username = identityInfo.userInfo.username;
      const name = identityInfo.userInfo.name || username;

      window.myIdentity = username;
      signedInOnlyNavLinks.forEach((link) => {
        link.style.display = "";
      });

      if (identity_div) {
        identity_div.innerHTML = `
          <span>
            Signed in as 
            <a href="/profile.html?user=${encodeURIComponent(username)}">
              ${escapeHTML(name)} (${escapeHTML(username)})
            </a>
          </span>
          <a href="/signout" class="btn btn-outline-danger btn-sm ms-2">
            Log out
          </a>
        `;
      }
    } else {
      // logged out
      window.myIdentity = undefined;
      signedInOnlyNavLinks.forEach((link) => {
        link.style.display = "none";
      });

      if (identity_div) {
        identity_div.innerHTML = `
          <a href="/signin" class="btn btn-primary btn-sm">
            Log in with UW
          </a>
        `;
      }
    }
  } 
  catch (error) {
    console.error("Error loading identity:", error);
    window.myIdentity = undefined;
    signedInOnlyNavLinks.forEach((link) => {
      link.style.display = "none";
    });

    if (identity_div) {
      identity_div.innerHTML = `
        <button class="btn btn-sm btn-secondary" onclick="loadIdentity()">
          Retry
        </button>
        <span class="text-danger ms-2">Error loading identity</span>
      `;
    }
  }
}
