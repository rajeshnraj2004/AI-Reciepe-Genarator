import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ConnectDB from "../backend/config/db.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB FIRST
ConnectDB();

// Test route
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// Port fallback (IMPORTANT)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});