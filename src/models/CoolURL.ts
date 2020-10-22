import CoolURLSchema from "../schemas/CoolURLSchema";
import { model } from "mongoose";

const CoolURL = model("CoolURL", CoolURLSchema);

export default CoolURL;
