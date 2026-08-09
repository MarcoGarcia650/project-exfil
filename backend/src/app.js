import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Feature routes get mounted here as they're built, e.g.:
// app.use("/employers", employerRoutes);

export default app;
