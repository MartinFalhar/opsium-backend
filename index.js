import express from "express";
import usersRoutes from "./routes/users.routes.js";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
app.use(cors()); // Enable CORS policyfor all routes
const port = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/", usersRoutes);

// app.use(
//   cors({
//     origin: "http://localhost:5173",
//   })
// );

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
