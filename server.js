require("dotenv").config();

const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log("ADMIN_KEY:", process.env.ADMIN_KEY);

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Create empty songs.json if not exists
const songsFilePath = path.join(__dirname, "songs.json");
if (!fs.existsSync(songsFilePath)) {
    fs.writeFileSync(songsFilePath, JSON.stringify([]));
}

// Configure storage
const storage = multer.memoryStorage();

const upload = multer({ storage });

// Upload song
app.post("/upload", upload.single("song"), async (req, res) => {

    const ADMIN_PASSWORD = "12345";
    const adminKey = req.headers["x-admin-key"];

    if (!adminKey || adminKey !== ADMIN_PASSWORD) {
        return res.status(403).json({ message: "Unauthorized" });
    }

    try {

        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: "video",
                folder: "music-player"
            },
            async (error, result) => {

                if (error) {
                    console.log(error);
                    return res.status(500).json({ message: "Upload failed" });
                }

                const songs = JSON.parse(fs.readFileSync(songsFilePath));

                const newSong = {
                    name: req.file.originalname,
                    url: result.secure_url
                };

                songs.push(newSong);

                fs.writeFileSync(songsFilePath, JSON.stringify(songs, null, 2));

                res.json({ message: "Song uploaded successfully" });
            }
        );

        stream.end(req.file.buffer);

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get all songs
app.get("/songs", (req, res) => {
    try {
        const songs = JSON.parse(fs.readFileSync(songsFilePath));
        res.json(songs);
    } catch (err) {
        res.status(500).json({ message: "Failed to load songs" });
    }
});

// Test route
app.get("/", (req, res) => {
  res.send("Music Player Backend Running 🚀");
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
