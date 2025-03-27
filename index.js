const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const admin = require("firebase-admin");
const uploadToDrive = require("./uploadToDrive");
require("dotenv").config();
const Letter = require("./models/Letter");
const { OAuth2Client } = require("google-auth-library");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5001;

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:3000", "https://your-deployed-frontend.com"],
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization",
    credentials: true,
  })
);

// ✅ Fix Cross-Origin Issues
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

// ✅ Initialize Firebase Admin SDK
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ GOOGLE_APPLICATION_CREDENTIALS file not found!");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ✅ Verify Firebase Token Middleware
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "❌ Unauthorized: No token provided" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error);
    return res.status(401).json({ message: "❌ Unauthorized: Invalid token" });
  }
};

// ✅ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Save Letter to MongoDB & Google Drive
app.post("/save-letter", verifyToken, async (req, res) => {
  try {
    const { letter, userToken } = req.body;

    if (!userToken) {
      return res.status(401).json({ message: "❌ No OAuth2 token received from frontend" });
    }

    console.log("🔹 Received OAuth2 Token:", userToken);

    // ✅ Verify OAuth2 Token
    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({ access_token: userToken });

    const tokenInfo = await oauth2Client.getTokenInfo(userToken);
    console.log("✅ Google OAuth Token Info:", tokenInfo);

    // ✅ Save Letter to MongoDB
    const newLetter = new Letter({ content: letter, userId: req.user.uid });
    await newLetter.save();
    console.log("✅ Letter saved to MongoDB:", newLetter._id);

    // ✅ Upload to Google Drive
    console.log("🔹 Uploading file to Google Drive...");
    const fileId = await uploadToDrive(letter, oauth2Client);

    res.json({ message: "✅ Letter saved successfully!", letter: newLetter, fileId });
  } catch (error) {
    console.error("❌ Error saving letter:", error);
    res.status(500).json({ message: "❌ Error saving letter" });
  }
});

// ✅ Get All Saved Letters (Only for Authenticated Users)
app.get("/letters", verifyToken, async (req, res) => {
  try {
    const letters = await Letter.find({ userId: req.user.uid });
    res.json(letters);
  } catch (error) {
    console.error("❌ Error fetching letters:", error);
    res.status(500).json({ message: "❌ Error fetching letters" });
  }
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

// ✅ Root Route
app.get("/", (req, res) => {
  res.send("✅ Backend is running!");
});
