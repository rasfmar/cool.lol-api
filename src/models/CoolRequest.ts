import CoolRequestSchema from "../schemas/CoolRequestSchema";
import { model } from "mongoose";

const CoolRequest = model("CoolRequest", CoolRequestSchema);

export default CoolRequest;
