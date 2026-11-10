import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import programRoutes from "./routes/programRoutes.js";
import organizationRoutes from "./routes/organizationRoutes.js";
import savedEmployerRoutes from "./routes/savedEmployerRoutes.js";
import actionItemRoutes from "./routes/actionItemRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

const app = express();

// Only trust X-Forwarded-For for a known number of proxy hops (e.g. "2" for
// CloudFront → EB nginx). Never `true`: that lets clients spoof their IP and
// dodge rate limits. Unset = trust nothing, and req.ip is the direct peer.
// The production value still has to be verified against real headers.
if (process.env.TRUST_PROXY) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY));
}

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/programs", programRoutes);
app.use("/organizations", organizationRoutes);
app.use("/saved-employers", savedEmployerRoutes);
app.use("/action-items", actionItemRoutes);
app.use("/dashboard", dashboardRoutes);

export default app;
