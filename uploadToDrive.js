const { google } = require("googleapis");

async function uploadToDrive(letter, oauth2Client) {
  try {
    console.log("🔹 Uploading file to Google Drive using user's account...");

    const drive = google.drive({ version: "v3", auth: oauth2Client }); // ✅ Use OAuth2 client for authentication

    const fileMetadata = {
      name: `Letter_${Date.now()}.txt`, // You can change the file name format here
      mimeType: "text/plain",
      parents: ["root"], // ✅ Ensures file appears in "My Drive"
    };

    const media = {
      mimeType: "text/plain",
      body: letter,
    };

    // Create the Google Drive file
    const driveResponse = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id",
    });

    console.log("✅ Google Drive File Created:", driveResponse.data.id);
    return driveResponse.data.id;
  } catch (error) {
    console.error("❌ Google Drive API Error:", error.response ? error.response.data : error.message);
    throw new Error("❌ Failed to upload file to Google Drive");
  }
}

module.exports = uploadToDrive;
