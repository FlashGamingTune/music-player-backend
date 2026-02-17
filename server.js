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
const PORT = 5000;

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
                resource_type: "video", // important for audio
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

// Stream song with range support
app.get("/stream/:filename", (req, res) => {
    const filePath = path.join(uploadFolder, req.params.filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).send("File not found");
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        const chunkSize = end - start + 1;
        const file = fs.createReadStream(filePath, { start, end });

        res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunkSize,
            "Content-Type": "audio/mpeg"
        });

        file.pipe(res);
    } else {
        res.writeHead(200, {
            "Content-Length": fileSize,
            "Content-Type": "audio/mpeg"
        });

        fs.createReadStream(filePath).pipe(res);
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
