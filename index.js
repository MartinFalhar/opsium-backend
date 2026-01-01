import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import puppeteer from "puppeteer";
import bodyParser from "body-parser";

// Import route modules
import adminRoutes from "./routes/admin.routes.js";
import optotypRoutes from "./routes/optotyp.routes.js";
import pageRoutes from "./routes/page.routes.js";
import clientRoutes from "./routes/client.routes.js";
import catalogRoutes from "./routes/catalog.routes.js";
import storeRoutes from "./routes/store.routes.js";
import emailRoutes from "./routes/email.routes.js";
import smsRoutes from "./routes/sms.routes.js";
import pdfRoutes from "./routes/pdf.routes.js";


const app = express();

// Seznam domén, kterým chceme povolit přístup
const allowedOrigins = [
  "http://localhost:5173", // vývojové prostředí
  "http://localhost:3000", // pro jistotu
  "https://opsium-frontend.onrender.com", // produkce
  "https://www.opsium.cz", // produkce
  "https://opsium.cz", // produkce
];
//ORIGINAL VERSION
// app.use(cors()); // Enable CORS policy for all routes.

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS: " + origin));
      }
    },
    credentials: true,
  })
);

const port = process.env.PORT || 3000;

app.use(express.static("public"));
const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/", pageRoutes);
app.use("/admin", adminRoutes);
app.use("/catalog", catalogRoutes);
app.use("/client", clientRoutes);
app.use("/store", storeRoutes);
app.use("/optotype", optotypRoutes);
app.use("/email", emailRoutes);
app.use("/sms", smsRoutes);
app.use("/pdf", pdfRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
