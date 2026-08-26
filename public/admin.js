const submissions = document.getElementById("submissions");
const pendingCount = document.getElementById("pendingCount");
const toast = document.getElementById("toast");

let ADMIN_KEY = "";


// ===============================
// ADMIN LOGIN
// ===============================

function askAdminKey() {

    if (ADMIN_KEY) return true;

    const key = prompt(
        "Enter PixWall Admin Key:"
    );

    if (!key) return false;

    ADMIN_KEY = key;

    return true;
}


// ===============================
// LOAD PENDING
// ===============================

async function loadPending() {

    if (!askAdminKey()) return;

    submissions.innerHTML = `
        <div class="loading">
            Loading submissions...
        </div>
    `;

    try {

        const response = await fetch(
            "/api/admin/pending",
            {
                headers: {
                    "x-admin-key": ADMIN_KEY
                }
            }
        );


        if (response.status === 401) {

            ADMIN_KEY = "";

            showToast(
                "Invalid admin key."
            );

            submissions.innerHTML = `
                <div class="empty">
                    Access denied.
                </div>
            `;

            return;
        }


        const data =
            await response.json();


        renderSubmissions(data);


    } catch (error) {

        console.error(error);

        submissions.innerHTML = `
            <div class="empty">
                Unable to connect to server.
            </div>
        `;
    }
}


// ===============================
// RENDER
// ===============================

function renderSubmissions(items) {

    pendingCount.textContent =
        items.length;


    if (!items.length) {

        submissions.innerHTML = `
            <div class="empty">
                <h3>No pending submissions</h3>
                <p style="margin-top:8px">
                    New wallpaper uploads will appear here.
                </p>
            </div>
        `;

        return;
    }


    submissions.innerHTML =
        items.map(createSubmission).join("");
}


// ===============================
// CARD
// ===============================

function createSubmission(item) {

    const title =
        escapeHTML(item.title);

    const creator =
        escapeHTML(item.creator);

    const category =
        escapeHTML(item.category);

    const tags =
        escapeHTML(item.tags || "");


    return `
        <article
            class="submission-card"
            id="card-${item.id}"
        >

            <img
                class="submission-image"
                src="${item.imageUrl}"
                alt="${title}"
            >


            <div class="submission-content">

                <h3>
                    ${title}
                </h3>


                <p class="creator">
                    By ${creator}
                </p>


                <div class="meta">

                    <span>
                        ${category}
                    </span>

                    ${
                        tags
                        ? `<span>${tags}</span>`
                        : ""
                    }

                </div>


                <div class="actions">

                    <button
                        class="approve"
                        onclick="
                            moderate(
                                '${item.id}',
                                'approve'
                            )
                        "
                    >
                        ✓ Approve
                    </button>


                    <button
                        class="reject"
                        onclick="
                            moderate(
                                '${item.id}',
                                'reject'
                            )
                        "
                    >
                        × Reject
                    </button>

                </div>


                <button
                    class="delete-btn"
                    onclick="
                        deleteWallpaper(
                            '${item.id}'
                        )
                    "
                >
                    Delete permanently
                </button>

            </div>

        </article>
    `;
}


// ===============================
// APPROVE / REJECT
// ===============================

async function moderate(id, action) {

    if (!askAdminKey()) return;


    const actionText =
        action === "approve"
            ? "approve"
            : "reject";


    const confirmed =
        confirm(
            `Are you sure you want to ${actionText} this wallpaper?`
        );


    if (!confirmed) return;


    try {

        const response =
            await fetch(
                `/api/admin/${id}/${action}`,
                {
                    method: "POST",

                    headers: {
                        "x-admin-key":
                            ADMIN_KEY
                    }
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.error ||
                "Action failed."
            );
        }


        showToast(
            action === "approve"
                ? "Wallpaper approved."
                : "Wallpaper rejected."
        );


        loadPending();


    } catch (error) {

        showToast(
            error.message
        );
    }
}


// ===============================
// DELETE
// ===============================

async function deleteWallpaper(id) {

    if (!askAdminKey()) return;


    if (
        !confirm(
            "Delete this wallpaper permanently?"
        )
    ) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/admin/${id}`,
                {
                    method: "DELETE",

                    headers: {
                        "x-admin-key":
                            ADMIN_KEY
                    }
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.error ||
                "Delete failed."
            );
        }


        showToast(
            "Wallpaper deleted."
        );


        loadPending();


    } catch (error) {

        showToast(
            error.message
        );
    }
}


// ===============================
// TOAST
// ===============================

function showToast(message) {

    toast.textContent = message;

    toast.classList.add("show");


    setTimeout(() => {

        toast.classList.remove("show");

    }, 2500);
}


// ===============================
// SECURITY
// ===============================

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ===============================
// START
// ===============================

loadPending();
