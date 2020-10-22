import { Schema } from "mongoose";
import { KEY_REGEX, SLUG_REGEX, FULL_URL_REGEX } from "../config/constants";

const urlSchema = new Schema({
  slug: {
    type: String,
    required: [true, "Slug required"],
    lowercase: true,
    trim: true,
    match: SLUG_REGEX,
    unique: true,
  },
  url: {
    type: String,
    required: [true, "URL required"],
    match: FULL_URL_REGEX,
  },
  key: {
    type: String,
    required: [true, "Secret key required"],
    trim: true,
    match: KEY_REGEX,
    unique: true,
  },
  clicks: {
    type: Array,
    default: [],
  },
  ip: {
    type: String,
    default: "",
    /*
    required: true,
    trim: true,
    validate: {
      validator: (v: string) => (IPV4_REGEX.test(v) || IPV6_REGEX.test(v)),
    },
    */
  },
  accesses: {
    type: Array,
    default: [],
  },
  createdAt: {
    type: Number,
    default: 0,
    required: true,
    min: 0,
  },
  deletedAt: {
    type: Number,
    default: -1,
    min: -1,
  },
}, {
  collection: "urls",
});

export default urlSchema;
