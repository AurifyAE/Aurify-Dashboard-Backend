// import admin  from "firebase-admin"
// import serviceAccount from "./pushnotifaction.json" assert { type: "json" };
// import dotenv from "dotenv";
// dotenv.config();
// const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
// admin.initializeApp({
//   credential: admin.credential.cert(credentials),
//   projectId:process.env.PROJECTID
// })

// export default admin;


// utils/firebase.js

import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Resolve the path to your JSON service account
const serviceAccountPath = path.resolve("./utils/pushnotifaction.json");

// Read and parse the JSON file
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.PROJECTID
});

export default admin;
