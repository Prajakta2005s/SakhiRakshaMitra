const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// Create uploads folder
const fs = require("fs");

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Audio storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname) || ".wav";

    cb(
      null,
      `voice_sos_${Date.now()}${extension}`
    );
  },
});

const upload = multer({
  storage: storage,
});

// Test server
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Sakhi RakshaMitra Voice SOS Server is running",
  });
});

// Receive Voice SOS
app.post("/voice-sos", upload.single("audio"), (req, res) => {
  console.log("");
  console.log("================================");
  console.log("VOICE SOS RECEIVED");
  console.log("================================");

  console.log("Trusted Name:", req.body.trustedName);
  console.log("Trusted Phone:", req.body.trustedPhone);

  if (!req.file) {
    console.log("Audio file NOT received");

    return res.status(400).json({
      success: false,
      message: "Audio file was not received",
    });
  }

  console.log("Audio file:", req.file.filename);
  console.log("Saved at:", req.file.path);

  res.json({
    success: true,
    message: "Voice SOS audio received successfully",
    filename: req.file.filename,
  });
});

// Start server
const PORT = 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("================================");
  console.log("SAKHI RAKSHAMITRA SERVER");
  console.log("================================");
  console.log(`Server running on port ${PORT}`);
  console.log("================================");
  console.log("");
});