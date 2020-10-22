import { Schema } from "mongoose";

const requestSchema = new Schema({
  ip: {
    type: String,
    default: "",
  },
  when: {
    type: Number,
    default: 0,
    min: 0,
  }
}, {
  collection: "reqs",
});

export default requestSchema;
