import express from "express";
import cors from "cors";
import { db } from "./config/db.js";

const app = express();

app.use(cors());
app.use(express.json());

// Test DB connection
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Database connected successfully");
    connection.release();
  }
});

export default app;
