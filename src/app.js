const express = require("express");
const cors = require("cors");
const app = express();

const authRoutes = require("./routes/auth");
const dataRoutes = require("./routes/data");

// Middleware: Enable CORS
app.use(cors({
  origin: "http://localhost:3001", // <-- Replace with your frontend URL
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Routes
app.use("/api", authRoutes);
app.use("/api", dataRoutes);

module.exports = app;
