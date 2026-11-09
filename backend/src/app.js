import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import programRoutes from "./routes/programRoutes.js";
import savedEmployerRoutes from "./routes/savedEmployerRoutes.js";
import actionItemRoutes from "./routes/actionItemRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/programs", programRoutes);
app.use("/saved-employers", savedEmployerRoutes);
app.use("/action-items", actionItemRoutes);
app.use("/dashboard", dashboardRoutes);

export default app;
