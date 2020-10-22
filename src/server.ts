import dotenv from "dotenv";
import express, { Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import urlRouter from "./routes/urlRouter.js";
import { notFoundHandler, errorHandler } from "./controllers/errorHandler.js";
import { DEFAULT_MONGODB_URI, DEFAULT_PORT, DEFAULT_CORS_ORIGIN } from "./config/constants.js";
import mongoose from "mongoose";

dotenv.config();
mongoose.connect(process.env.MONGODB_URI || DEFAULT_MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const app: Express = express();
app.use(helmet());
app.use(morgan("common"));

const origin: string = process.env.CORS_ORIGIN || DEFAULT_CORS_ORIGIN;
app.use(cors({ origin: origin }));
app.use(express.json());

app.use("/api", urlRouter);
app.use(notFoundHandler);
app.use(errorHandler);

const port: string = process.env.PORT || DEFAULT_PORT;
app.listen(port, () => {
  console.log(`Server listening at https://localhost:${port}`);
});
