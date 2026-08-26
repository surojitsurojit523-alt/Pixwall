const submissions = document.getElementById("submissions");

const pendingCount = document.getElementById("pendingCount");
const approvedCount = document.getElementById("approvedCount");
const rejectedCount = document.getElementById("rejectedCount");
const totalCount = document.getElementById("totalCount");

const toast = document.getElementById("toast");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

const maintenanceStatus =
    document.getElementById("maintenanceStatus");

const maintenanceBtn =
    document.getElementById("maintenanceBtn");

const maintenanceText =
    document.getElementById("maintenanceText");


let ADMIN_KEY = "";

let wallpapers = [];


// ===============================
// ADMIN LOGIN
// ===============================

function askAdminKey() {

    if (ADMIN_KEY) return true;

    const key = prompt(
        "Enter PixWall Admin Key:"
    );

    if (!key) return false;

    ADMIN_KEY = key.trim();

    return true;
}


// ===============================
// ADMIN REQUEST
// ===============================

async function adminFetch(url, options = {}) {

    if (!askAdminKey()) {
        throw new Error("Admin authentication required.");
    }

    const response = await fetch(
        url,
        {
            ...options,

            headers: {
                ...(options.headers || {}),
                "x-admin-key": ADMIN_KEY
            }
        }
    );

    if (response.status === 401) {

        ADMIN_KEY = "";

        throw new Error(
            "Invalid admin key."
        );
    }

    const result =
        await response.json();

    if (!response.ok) {

        throw new Error(
            result.error ||
            "Request failed."
        );
    }

    return result;
}


// ===============================
// LOAD ALL
// ===============================

async function loadAll() {

    if (!askAdminKey()) return;

    submissions.innerHTML = `
        <div class="loading">
            Loading wallpapers...
        </div>
    `;

    try {

        wallpapers =
            await adminFetch(
                "/api/admin/wallpapers"
            );

        updateStats();

        renderWallpapers();

        loadMaintenance();

    } catch (error) {

        console.error(error);

        submissions.innerHTML = `
            <div class="empty">
                <h3>Unable to load wallpapers</h3>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;
    }
}


// ===============================
// STATS
// ===============================

function updateStats() {

    const pending =
        wallpapers.filter(
            item => item.status === "pending"
        ).length;

    const approved =
        wallpapers.filter(
            item => item.status === "approved"
        ).length;

    const rejected =
        wallpapers.filter(
            item => item.status === "rejected"
        ).length;

    pendingCount.textContent = pending;
    approvedCount.textContent = approved;
    rejectedCount.textContent = rejected;
    totalCount.textContent = wallpapers.length;
}


// ===============================
// SEARCH + FILTER
// ===============================

function getFilteredWallpapers() {

    const search =
        String(
            searchInput.value || ""
        )
        .trim()
        .toLowerCase();

    const status =
        statusFilter.value;


    return wallpapers.filter(item => {

        const searchable = [

            item.title,
            item.creator,
            item.category,
            item.tags

        ]
        .join(" ")
        .toLowerCase();


        const matchesSearch =
            !search ||
            searchable.includes(search);


        const matchesStatus =
            status === "all" ||
            item.status === status;


        return (
            matchesSearch &&
            matchesStatus
        );
    });
}


function renderWallpapers() {

    const items =
        getFilteredWallpapers();


    if (!items.length) {

        submissions.innerHTML = `
            <div class="empty">
                <h3>No wallpapers found</h3>
                <p>
                    Try another search or filter.
                </p>
            </div>
        `;

        return;
    }


    submissions.innerHTML =
        items
            .map(createWallpaperCard)
            .join("");
}


// ===============================
// WALLPAPER CARD
// ===============================

function createWallpaperCard(item) {

    const title =
        escapeHTML(item.title);

    const creator =
        escapeHTML(item.creator);

    const category =
        escapeHTML(item.category);

    const tags =
        escapeHTML(item.tags || "");

    const status =
        escapeHTML(item.status);


    return `
        <article
            class="submission-card"
            id="card-${item.id}"
        >

            <img
                class="submission-image"
                src="${escapeHTML(item.imageUrl)}"
                alt="${title}"
                loading="lazy"
            >


            <div class="submission-content">

                <div class="card-top">

                    <span
                        class="status-badge status-${status}">
                        ${status}
                    </span>

                </div>


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

                    ${
                        item.status !== "approved"
                        ? `
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
                        `
                        : `
                        <button
                            class="approve"
                            disabled
                        >
                            ✓ Approved
                        </button>
                        `
                    }


                    ${
                        item.status !== "rejected"
                        ? `
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
                        `
                        : `
                        <button
                            class="reject"
                            disabled
                        >
                            × Rejected
                        </button>
                        `
                    }

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

    const item =
        wallpapers.find(
            wallpaper =>
                wallpaper.id === id
        );


    if (!item) return;


    const actionText =
        action === "approve"
            ? "approve"
            : "reject";


    const confirmed =
        confirm(
            `Are you sure you want to ${actionText} "${item.title}"?`
        );


    if (!confirmed) return;


    try {

        await adminFetch(
            `/api/admin/${id}/${action}`,
            {
                method: "POST"
            }
        );


        showToast(
            action === "approve"
                ? "Wallpaper approved."
                : "Wallpaper rejected."
        );


        await loadAll();


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

    const item =
        wallpapers.find(
            wallpaper =>
                wallpaper.id === id
        );


    if (!item) return;


    const confirmed =
        confirm(
            `Delete "${item.title}" permanently?\n\nThis will remove the wallpaper from PixWall and delete its uploaded image.`
        );


    if (!confirmed) return;


    try {

        await adminFetch(
            `/api/admin/${id}`,
            {
                method: "DELETE"
            }
        );


        showToast(
            "Wallpaper deleted permanently."
        );


        await loadAll();


    } catch (error) {

        showToast(
            error.message
        );
    }
}


// ===============================
// MAINTENANCE STATUS
// ===============================

async function loadMaintenance() {

    try {

        const data =
            await adminFetch(
                "/api/admin/maintenance"
            );


        updateMaintenanceUI(
            Boolean(data.enabled)
        );


    } catch (error) {

        console.error(
            "Maintenance status:",
            error
        );
    }
}


// ===============================
// TOGGLE MAINTENANCE
// ===============================

async function toggleMaintenance() {

    const current =
        maintenanceStatus.dataset.enabled === "true";


    const next =
        !current;


    const message =
        next
        ? "Enable Maintenance Mode?\n\nThe public PixWall website will become temporarily unavailable until you disable Maintenance Mode."
        : "Disable Maintenance Mode and make PixWall public again?";


    if (!confirm(message)) {
        return;
    }


    try {

        const data =
            await adminFetch(
                "/api/admin/maintenance",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            enabled: next
                        })
                }
            );


        updateMaintenanceUI(
            Boolean(data.enabled)
        );


        showToast(
            next
                ? "Maintenance Mode enabled."
                : "Maintenance Mode disabled."
        );


    } catch (error) {

        showToast(
            error.message
        );
    }
}


// ===============================
// MAINTENANCE UI
// ===============================

function updateMaintenanceUI(enabled) {

    maintenanceStatus.dataset.enabled =
        String(enabled);


    if (enabled) {

        maintenanceStatus.textContent =
            "MAINTENANCE ACTIVE";

        maintenanceStatus.className =
            "status-badge maintenance-active";

        maintenanceBtn.textContent =
            "Disable Maintenance";

        maintenanceText.textContent =
            "Public access is currently paused. Admin access remains available.";

    } else {

        maintenanceStatus.textContent =
            "SERVICE ONLINE";

        maintenanceStatus.className =
            "status-badge service-online";

        maintenanceBtn.textContent =
            "Enable Maintenance";

        maintenanceText.textContent =
            "PixWall is currently available to visitors.";
    }
}


// ===============================
// TOAST
// ===============================

function showToast(message) {

    toast.textContent =
        message;

    toast.classList.add("show");


    setTimeout(() => {

        toast.classList.remove("show");

    }, 2800);
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
// EVENTS
// ===============================

searchInput.addEventListener(
    "input",
    renderWallpapers
);

statusFilter.addEventListener(
    "change",
    renderWallpapers
);


// ===============================
// START
// ===============================

loadAll();
