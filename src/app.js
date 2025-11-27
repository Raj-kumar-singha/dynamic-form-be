require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");

// Check for required environment variables
if (!process.env.JWT_SECRET) {
  console.error("⚠️  WARNING: JWT_SECRET is not set in environment variables!");
  console.error("⚠️  Please set JWT_SECRET in your .env file");
  console.error("⚠️  Authentication will not work without this!");
}

const adminRoutes = require("./routes/adminRoutes");
const formRoutes = require("./routes/formRoutes");
const submissionRoutes = require("./routes/submissionRoutes");

const app = express();

// Middleware
// HTTP request logger - use 'dev' format in development, 'combined' in production
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// CORS configuration - Allow all origins in development, specific origins in production
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? process.env.ALLOWED_ORIGINS?.split(",") || ["https://dynamic-form-fe.onrender.com"]
      : true, // Allow all origins in development
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/dynamic-form-builder";
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("MongoDB connected");
    // Create default admin user if none exists
    const { createDefaultAdmin } = require("./services/adminSetup");
    await createDefaultAdmin();
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/admin", adminRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/submissions", submissionRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Dynamic Form Builder API is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
