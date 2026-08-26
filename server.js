const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, "uploads");
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "wallpapers.json");

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, "[]");
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the PixWall website
app.use(express.static(path.join(__dirname, "public")));

// Serve uploaded wallpapers
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, crypto.randomUUID() + ext);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 20 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {

        const allowed = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPG, PNG and WEBP are allowed."));
        }
    }
});

function readWallpapers() {
    try {
        return JSON.parse(
            fs.readFileSync(dataFile, "utf8")
        );
    } catch {
        return [];
    }
}

function saveWallpapers(data) {
    fs.writeFileSync(
        dataFile,
        JSON.stringify(data, null, 2)
    );
}


// ===============================
// PUBLIC WALLPAPERS
// ===============================

app.get("/api/wallpapers", (req, res) => {

    const wallpapers = readWallpapers();

    const approved = wallpapers.filter(
        item => item.status === "approved"
    );

    res.json(approved);
});


// ===============================
// UPLOAD WALLPAPER
// ===============================

app.post(
    "/api/upload",
    upload.single("image"),
    (req, res) => {

        if (!req.file) {
            return res.status(400).json({
                error: "Please select an image."
            });
        }

        const title =
            String(req.body.title || "").trim();

        const creator =
            String(req.body.creator || "").trim();

        const category =
            String(req.body.category || "Nature").trim();

        const tags =
            String(req.body.tags || "").trim();

        if (!title || !creator) {

            fs.unlinkSync(req.file.path);

            return res.status(400).json({
                error: "Title and creator are required."
            });
        }

        const wallpapers = readWallpapers();

        const wallpaper = {

            id: crypto.randomUUID(),

            title: title.slice(0, 80),

            creator: creator.slice(0, 40),

            category,

            tags,

            imageUrl:
                "/uploads/" + req.file.filename,

            status: "pending",

            createdAt:
                new Date().toISOString()

        };

        wallpapers.push(wallpaper);

        saveWallpapers(wallpapers);

        res.json({
            success: true,
            message: "Wallpaper submitted for review."
        });
    }
);


// ===============================
// ADMIN AUTH
// ===============================

function adminAuth(req, res, next) {

    const key =
        req.headers["x-admin-key"];

    const adminKey =
        process.env.ADMIN_KEY ||
        "pixwall-admin-2026";

    if (key !== adminKey) {

        return res.status(401).json({
            error: "Unauthorized"
        });
    }

    next();
}


// ===============================
// ADMIN PENDING
// ===============================

app.get(
    "/api/admin/pending",
    adminAuth,
    (req, res) => {

        const wallpapers =
            readWallpapers();

        res.json(
            wallpapers.filter(
                item => item.status === "pending"
            )
        );
    }
);


// ===============================
// ADMIN APPROVE / REJECT
// ===============================

app.post(
    "/api/admin/:id/:action",
    adminAuth,
    (req, res) => {

        const wallpapers =
            readWallpapers();

        const item =
            wallpapers.find(
                wallpaper =>
                    wallpaper.id === req.params.id
            );

        if (!item) {

            return res.status(404).json({
                error: "Wallpaper not found."
            });
        }

        if (req.params.action === "approve") {

            item.status = "approved";

        } else if (req.params.action === "reject") {

            item.status = "rejected";

        } else {

            return res.status(400).json({
                error: "Invalid action."
            });
        }

        saveWallpapers(wallpapers);

        res.json({
            success: true,
            status: item.status
        });
    }
);


// ===============================
// ADMIN DELETE
// ===============================

app.delete(
    "/api/admin/:id",
    adminAuth,
    (req, res) => {

        const wallpapers =
            readWallpapers();

        const index =
            wallpapers.findIndex(
                item =>
                    item.id === req.params.id
            );

        if (index === -1) {

            return res.status(404).json({
                error: "Wallpaper not found."
            });
        }

        const wallpaper =
            wallpapers[index];

        const imagePath =
            path.join(
                __dirname,
                wallpaper.imageUrl
                    .replace("/uploads/", "uploads/")
            );

        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        wallpapers.splice(index, 1);

        saveWallpapers(wallpapers);

        res.json({
            success: true
        });
    }
);
// ===============================
// LIKE WALLPAPER
// ===============================

app.post("/api/wallpapers/:id/like", (req, res) => {
    const wallpapers = readWallpapers();

    const item = wallpapers.find(
        wallpaper => wallpaper.id === req.params.id
    );

    if (!item) {
        return res.status(404).json({
            error: "Wallpaper not found."
        });
    }

    if (item.status !== "approved") {
        return res.status(403).json({
            error: "Wallpaper is not public."
        });
    }

    item.likes = Number(item.likes || 0) + 1;

    saveWallpapers(wallpapers);

    res.json({
        success: true,
        likes: item.likes
    });
});

// ===============================
// ERROR HANDLER
// ===============================

app.use((err, req, res, next) => {

    console.error(err);

    res.status(400).json({
        error: err.message || "Upload failed."
    });
});


// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {

    console.log("");
    console.log("================================");
    console.log("       PIXWALL SERVER");
    console.log("================================");
    console.log(
        "Running: http://localhost:" + PORT
    );
    console.log("================================");
    console.log("");

});


