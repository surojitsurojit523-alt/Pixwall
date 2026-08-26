const grid = document.getElementById("wallpaperGrid");
const searchInput = document.getElementById("searchInput");
const uploadModal = document.getElementById("uploadModal");
const uploadForm = document.getElementById("uploadForm");
const uploadStatus = document.getElementById("uploadStatus");

let wallpapers = [];
let currentCategory = "All";


// =========================
// LOAD WALLPAPERS
// =========================

async function loadWallpapers() {

    try {

        const response =
            await fetch("/api/wallpapers");

        if (!response.ok) {
            throw new Error("Failed to load wallpapers");
        }

        wallpapers = await response.json();

        renderWallpapers();

    } catch (error) {

        console.error(error);

        grid.innerHTML = `
            <div class="loading">
                Unable to load wallpapers.
            </div>
        `;
    }
}


// =========================
// RENDER
// =========================

function renderWallpapers() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();


    const filtered =
        wallpapers.filter(item => {

            const categoryMatch =
                currentCategory === "All" ||
                item.category === currentCategory;


            const searchMatch =
                !search ||
                item.title.toLowerCase().includes(search) ||
                item.creator.toLowerCase().includes(search) ||
                item.category.toLowerCase().includes(search) ||
                (item.tags || "")
                    .toLowerCase()
                    .includes(search);


            return categoryMatch && searchMatch;

        });


    if (filtered.length === 0) {

        grid.innerHTML = `
            <div class="loading">
                No wallpapers found.
            </div>
        `;

        return;
    }


    grid.innerHTML =
        filtered.map(createCard).join("");
}


// =========================
// CREATE CARD
// =========================

function createCard(item) {

    const safeTitle =
        escapeHTML(item.title);

    const safeCreator =
        escapeHTML(item.creator);

    const safeCategory =
        escapeHTML(item.category);

    return `
        <article
            class="wallpaper-card"
            onclick="openWallpaper('${item.id}')"
        >

            <img
                src="${item.imageUrl}"
                alt="${safeTitle}"
                loading="lazy"
            >

            <div class="wallpaper-info">

                <h3>
                    ${safeTitle}
                </h3>

                <p>
                    ${safeCreator}
                    ·
                    ${safeCategory}
                </p>

                <div class="card-stats">
                 </div>

            </div>

        </article>
    `;
}

// =========================
// SEARCH
// =========================

searchInput.addEventListener(
    "input",
    renderWallpapers
);


// =========================
// CATEGORY
// =========================

function filterCategory(category, button) {

    currentCategory = category;


    document
        .querySelectorAll(".category")
        .forEach(item => {

            item.classList.remove("active");

        });


    button.classList.add("active");


    renderWallpapers();
}


// =========================
// UPLOAD MODAL
// =========================

function openUpload() {

    uploadModal.classList.add("show");

}


function closeUpload() {

    uploadModal.classList.remove("show");

    uploadStatus.textContent = "";

}


// Close when clicking outside

uploadModal.addEventListener(
    "click",
    event => {

        if (event.target === uploadModal) {

            closeUpload();

        }

    }
);


// =========================
// UPLOAD
// =========================

uploadForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const file =
            document.getElementById(
                "wallpaperFile"
            ).files[0];


        const title =
            document.getElementById(
                "wallpaperTitle"
            ).value.trim();


        const creator =
            document.getElementById(
                "creatorName"
            ).value.trim();


        const category =
            document.getElementById(
                "wallpaperCategory"
            ).value;


        const tags =
            document.getElementById(
                "wallpaperTags"
            ).value.trim();


        if (!file) {

            uploadStatus.textContent =
                "Please select an image.";

            return;
        }


        if (!title || !creator) {

            uploadStatus.textContent =
                "Title and creator are required.";

            return;
        }


        if (file.size >
            20 * 1024 * 1024) {

            uploadStatus.textContent =
                "Image must be smaller than 20MB.";

            return;
        }


        const formData =
            new FormData();


        formData.append(
            "image",
            file
        );


        formData.append(
            "title",
            title
        );


        formData.append(
            "creator",
            creator
        );


        formData.append(
            "category",
            category
        );


        formData.append(
            "tags",
            tags
        );


        uploadStatus.textContent =
            "Uploading...";


        try {

            const response =
                await fetch(
                    "/api/upload",
                    {
                        method: "POST",
                        body: formData
                    }
                );


            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    result.error ||
                    "Upload failed."
                );

            }


            uploadStatus.textContent =
                "✓ Submitted! Waiting for admin approval.";


            uploadForm.reset();


            setTimeout(
                closeUpload,
                1800
            );


        } catch (error) {

            console.error(error);


            uploadStatus.textContent =
                error.message ||
                "Upload failed.";

        }

    }
);


// =========================
// WALLPAPER VIEW
// =========================

function openWallpaper(id) {

    const item =
        wallpapers.find(
            wallpaper =>
                wallpaper.id === id
        );


    if (!item) return;


    const viewer =
        document.createElement("div");


    viewer.className =
        "modal show";


    viewer.innerHTML = `

        <div class="modal-box">

            <button
                class="close-btn"
                onclick="this.parentElement.parentElement.remove()"
            >
                ×
            </button>


            <img
                src="${item.imageUrl}"
                style="
                    width:100%;
                    max-height:65vh;
                    object-fit:contain;
                    border-radius:14px;
                    background:#050506;
                "
            >


            <h2 style="margin-top:18px">
                ${escapeHTML(item.title)}
            </h2>


            <p class="modal-description">
                By ${escapeHTML(item.creator)}
                ·
                ${escapeHTML(item.category)}
            </p>


            <a
                href="${item.imageUrl}"
                download
                class="submit-btn"
                style="
                    display:block;
                    text-align:center;
                    margin-top:15px;
                    text-decoration:none;
                "
            >
                Download Wallpaper
            </a>

        </div>

    `;


    document.body.appendChild(viewer);
}

// =========================
// HTML SECURITY
// =========================

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// =========================
// START
// =========================

loadWallpapers();
