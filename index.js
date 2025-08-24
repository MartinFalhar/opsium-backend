import express from "express";
import usersRoutes from "./routes/users.routes.js";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();

// Seznam domén, kterým chceme povolit přístup
const allowedOrigins = [
  "http://localhost:5173", // vývojové prostředí
  "http://localhost:3000", // pro jistotu
  "https://opsium-frontend.onrender.com", // produkce
];
//ORIGINAL VERSION
// app.use(cors()); // Enable CORS policy for all routes.

// Enable CORS policy for all routes
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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/", usersRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
