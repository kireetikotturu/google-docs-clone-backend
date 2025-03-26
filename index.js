const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const admin = require("firebase-admin");
const { OAuth2Client } = require("google-auth-library");
const { google } = require("googleapis");
const uploadToDrive = require("./uploadToDrive"); // ✅ Import upload function

require("dotenv").config();
const Letter = require("./models/Letter");

const app = express();
const PORT = process.env.PORT || 5001;

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// ✅ Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
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
mongoose.connect(process.env.mongodb+srv://kireetikotturu:<Chandu@28052003>@cluster0.rscrsdu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Save Letter to MongoDB & Google Drive
app.post("/save-letter", verifyToken, async (req, res) => {
    try {
      const { letter, userToken } = req.body;
      console.log("🔹 Received userToken:", userToken);
  
      if (!userToken) {
        return res.status(401).json({ message: "❌ Unauthorized: No Google OAuth token provided" });
      }
  
      // ✅ Verify Google OAuth Token
      const oauth2Client = new OAuth2Client();
      oauth2Client.setCredentials({ access_token: userToken });
  
      try {
        const tokenInfo = await oauth2Client.getTokenInfo(userToken);
        console.log("✅ Google OAuth Token Verified:", tokenInfo);
      } catch (error) {
        console.error("❌ Invalid Google OAuth token:", error.message);
        return res.status(401).json({ message: "❌ Invalid Google OAuth token" });
      }
  
      // ✅ Save Letter to MongoDB
      const newLetter = new Letter({ content: letter, userId: req.user.uid });
      await newLetter.save();
      console.log("✅ Letter saved to MongoDB:", newLetter._id);
  
      // ✅ Save to Google Drive
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
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

// ✅ Root Route
app.get("/", (req, res) => {
  res.send("✅ Backend is running!");
});
