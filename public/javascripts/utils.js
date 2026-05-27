const escapeHTML = str => !str ? str : str.replace(/[&<>'"]/g, 
    tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag]));

function getBookCoverUrl(book, size = "M") {
    if (book && book.coverUrl) {
        return book.coverUrl;
    }

    if (book && book.ISBN) {
        return `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(book.ISBN)}-${size}.jpg`;
    }

    return "/images/no-cover.png";
}

function showInlineSignInPrompt(targetEl, message = "Please sign in to add books to your reading list.") {
    if (!targetEl) {
        return;
    }

    targetEl.innerHTML = `
        <div class="signin-prompt">
            <span>${escapeHTML(message)}</span>
            <a href="/signin" class="btn btn-primary btn-sm">Log in with UW</a>
        </div>
    `;
}

function ensureSiteFeedbackUI() {
    if (!document.getElementById("site_notice_container")) {
        const noticeContainer = document.createElement("div");
        noticeContainer.id = "site_notice_container";
        noticeContainer.className = "site-notice-container";
        document.body.appendChild(noticeContainer);
    }

    if (!document.getElementById("site_confirm_overlay")) {
        const overlay = document.createElement("div");
        overlay.id = "site_confirm_overlay";
        overlay.className = "site-confirm-overlay hidden";
        overlay.innerHTML = `
            <div class="site-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="site_confirm_title">
                <h3 id="site_confirm_title" class="site-confirm-title">Confirm action</h3>
                <p id="site_confirm_message" class="site-confirm-message"></p>
                <div class="site-confirm-actions">
                    <button id="site_confirm_cancel" class="btn btn-outline-secondary">Cancel</button>
                    <button id="site_confirm_ok" class="btn btn-danger">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
}

function showSiteNotice(message, options = {}) {
    ensureSiteFeedbackUI();

    const tone = options.tone || "info";
    const duration = options.duration ?? 4000;
    const container = document.getElementById("site_notice_container");
    if (!container) {
        return;
    }

    const notice = document.createElement("div");
    notice.className = `site-notice site-notice-${tone}`;
    notice.textContent = message;
    container.appendChild(notice);

    window.setTimeout(() => {
        notice.classList.add("site-notice-exit");
        window.setTimeout(() => notice.remove(), 220);
    }, duration);
}

function confirmInPage(options = {}) {
    ensureSiteFeedbackUI();

    const overlay = document.getElementById("site_confirm_overlay");
    const titleEl = document.getElementById("site_confirm_title");
    const messageEl = document.getElementById("site_confirm_message");
    const cancelBtn = document.getElementById("site_confirm_cancel");
    const okBtn = document.getElementById("site_confirm_ok");

    if (!overlay || !titleEl || !messageEl || !cancelBtn || !okBtn) {
        return Promise.resolve(false);
    }

    titleEl.textContent = options.title || "Confirm action";
    messageEl.textContent = options.message || "Are you sure you want to continue?";
    cancelBtn.textContent = options.cancelLabel || "Cancel";
    okBtn.textContent = options.confirmLabel || "Confirm";
    okBtn.className = options.confirmClass || "btn btn-danger";

    overlay.classList.remove("hidden");

    return new Promise((resolve) => {
        const close = (result) => {
            overlay.classList.add("hidden");
            cancelBtn.removeEventListener("click", onCancel);
            okBtn.removeEventListener("click", onConfirm);
            overlay.removeEventListener("click", onOverlay);
            resolve(result);
        };

        const onCancel = () => close(false);
        const onConfirm = () => close(true);
        const onOverlay = (event) => {
            if (event.target === overlay) {
                close(false);
            }
        };

        cancelBtn.addEventListener("click", onCancel);
        okBtn.addEventListener("click", onConfirm);
        overlay.addEventListener("click", onOverlay);
    });
}


async function fetchJSON(route, options){
    let response
    try{
        response = await fetch(route, {
            method: options && options.method ? options.method : "GET",
            body: options && options.body ? JSON.stringify(options.body) : undefined,
            headers: options && options.body ? {'Content-Type': 'application/json'}: undefined
        })
    }catch(error){
        displayError()
        throw new Error(
            `Error fetching ${route} with options: ${options ? JSON.stringify(options) : options}
             No response from server (failed to fetch)`)
    }
    let responseJson;
    try{
        responseJson = await response.clone().json();
    }catch(error){
        let responseText;
        try{
            responseText = await response.text();
        }catch(getTextError){
            displayError()
            throw new Error(
                `Error fetching ${route} with options: ${options ? JSON.stringify(options) : options}
                Status: ${response.status}
                Couldn't get response body
                error: ${getTextError}`)
        }
        displayError()
        throw new Error(
            `Error fetching ${route} with options: ${options ? JSON.stringify(options) : options}
            Status: ${response.status}
            Response wasn't json: ${responseText ? JSON.stringify(responseText) : responseText}
            error: ${error}`) // FIXED: was getTextError, should be error
    }
    if(response.status < 200 || response.status >= 300 || responseJson.status == "error"){
        displayError()
        throw new Error(
            `Error fetching ${route} with options: ${options ? JSON.stringify(options) : options}
            Status: ${response.status}
            Response: ${responseJson ? JSON.stringify(responseJson) : responseJson}`)
    }
    return responseJson
}

async function displayError(){
    document.getElementById('errorInfo').innerText = 'Error: action failed (see console for more information)'
    document.getElementById('errorInfo').style.opacity = 1
    // pause 4 seconds
    await new Promise(resolve => setTimeout(resolve, 4 * 1000))
    document.getElementById('errorInfo').innerText= ''
    document.getElementById('errorInfo').style.opacity = 0
}
