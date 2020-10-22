import dotenv from "dotenv"; dotenv.config();
import { Router } from "express";
import * as urlController from "../controllers/urlController";

const urlRouter = Router();
urlRouter.get("/", urlController.indexGet);
urlRouter.post("/create", urlController.indexPost);
urlRouter.get("/get/:slug", urlController.slugGet);
urlRouter.post("/get/:slug", urlController.slugPost);
urlRouter.get("/click/:slug", urlController.slugClickGet);
urlRouter.post("/delete/:slug", urlController.slugDeletePost);

export default urlRouter;
