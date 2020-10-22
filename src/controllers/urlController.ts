import dotenv from "dotenv"; dotenv.config();
import { Request, Response, NextFunction } from "express";
import HttpException from "../exceptions/HttpException";
import { SLUG_REGEX, KEY_REGEX, URL_REGEX, IPV6_REGEX, IPV4_REGEX } from "../config/constants";
import CoolURL from "../models/CoolURL";
import CoolRequest from "../models/CoolRequest";
import { nanoid } from "nanoid";
import sha1 from "sha1";
import { Error } from "mongoose";
import { MongoError } from "mongodb";

// TODO: track location, not IP, as this would be accessible by those w/ key for slug
// this gets the IP and hashes it using SHA1
const getHash = (req: Request) => {
  let ip = req.headers['x-forwarded-for'] ?? "";
  if (!ip) {
    ip = req.connection.remoteAddress ?? "";
  }
  if (!IPV6_REGEX.test(`${ip}`) && !IPV4_REGEX.test(`${ip}`)) {
    throw new HttpException(500, "Internal service error");
  }
  return sha1(ip.toString());
};

const rateLimit = async (ip: string) => {
  let amt = 0;
  const rates = await CoolRequest.find({
    ip: ip
  });
  if (rates) {
    rates.forEach((req) => {
      const reqObj = req.toObject();
      // if any requests are older than 1 hour
      if (Date.now() - reqObj.when >= 60*60*1000) {
        (async () => {
          await CoolRequest.deleteOne({
            _id: reqObj._id
          });
        })();
      } else {
        amt++;
      }
    });
  }
  // limit to 8 requests per hour
  if (amt < 8) {
    const coolRequest = new CoolRequest({
      ip: ip,
      when: Date.now(),
    });
    await coolRequest.save();
  } else {
    throw new HttpException(429, "Too many requests");
  }
};

export const indexGet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (process.env.NODE_ENV === "development") {
      const urls = await CoolURL.find();
      const response = urls?.map(doc => ({
        slug: doc.toObject().slug,
        url: doc.toObject().url
      }));
      res.json(response ?? []);
    } else {
      res.status(200);
      res.json({
        message: "OK",
      });
    }
  } catch (error) {
    next(error);
  }
};

export const indexPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rateLimit(getHash(req));
    const { url } = req.body;

    if (!URL_REGEX.test(url)) {
      throw new HttpException(400, "Invalid URL");
    }

    let slug: string = nanoid(5).toLowerCase();
    let key: string = nanoid(20).toLowerCase();
    let existingUrl = await CoolURL.find({ slug: slug, key: key });
    while (existingUrl.length > 0) {
      slug = nanoid(5).toLowerCase();
      key = nanoid(20).toLowerCase();
      existingUrl = await CoolURL.find({ slug: slug, key: key });
    }

    const coolUrl = new CoolURL({
      slug: slug,
      url: url,
      key: key,
      createdAt: Date.now()
    });
    
    const createdUrl = await coolUrl.save();
    res.json({
      slug: slug,
      key: key,
    });
  } catch (error) {
    if (error instanceof Error.ValidationError) {
      next(new HttpException(400, error.message.substr(8)));
    } else if (error instanceof MongoError) {
      next(new HttpException(422, "Duplicate key error"));
    } else {
      next(error);
    }
  }
};

export const slugGet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rateLimit(getHash(req));

    const { slug } = req.params;
    if (!SLUG_REGEX.test(slug)) {
      throw new HttpException(400, "Invalid slug");
    }

    const coolUrl = await CoolURL.findOne({ slug: slug });
    const response = coolUrl ? {
      slug: coolUrl.toObject().slug,
      url: coolUrl.toObject().url,
    } : null;
    
    if (coolUrl?.toObject()?.deletedAt === -1 && response) {
      res.json(response);
    } else {
      throw new HttpException(404, "Slug not found");
    }
  } catch (error) {
    next(error);
  }
};

export const slugPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rateLimit(getHash(req));

    const { slug } = req.params;
    const { key } = req.body;

    if (!SLUG_REGEX.test(slug) || !KEY_REGEX.test(key)) {
      throw new HttpException(400, "Invalid slug or key");
    }

    const coolUrl = await CoolURL.findOne({ slug: slug });
    if (coolUrl && coolUrl.toObject().deletedAt === -1) {
      if (coolUrl.toObject().key === key) {
        let accesses: object[] = coolUrl.toObject().accesses;
        accesses.push({
          ip: "",
          time: Date.now()
        });

        await CoolURL.updateOne(
          {
            slug: slug,
            key: key
          },
          { 
            $set: {
              accesses: accesses
            }
          }
        );

        const response = coolUrl.toObject();
        response.accesses = accesses;
        res.json(response);
      } else {
        throw new HttpException(403, "Access denied");
      }
    } else {
      throw new HttpException(404, "Slug not found");
    }
  } catch (error) {
    next(error);
  }
};

export const slugDeletePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rateLimit(getHash(req));

    const { slug } = req.params;
    const { key } = req.body;

    if (!SLUG_REGEX.test(slug) || !KEY_REGEX.test(key)) {
      throw new HttpException(400, "Invalid slug or key");
    }

    const coolUrl = await CoolURL.findOne({ slug: slug });
    if (coolUrl && coolUrl.toObject().deletedAt === -1) {
      if (coolUrl.toObject().key === key) {
        let accesses: object[] = coolUrl.toObject().accesses;
        accesses.push({
          ip: "",
          time: Date.now()
        });

        await CoolURL.updateOne(
          {
            slug: slug,
            key: key
          },
          { 
            $set: {
              accesses: accesses,
              deletedAt: Date.now()
            }
          }
        );

        res.status(200);
        res.json({
          message: "OK",
        });
      } else {
        throw new HttpException(403, "Access denied");
      }
    } else {
      throw new HttpException(404, "Slug not found");
    }
  } catch (error) {
    next(error);
  }
};

export const slugClickGet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    if (!SLUG_REGEX.test(slug)) {
      throw new HttpException(400, "Invalid slug");
    }

    const coolUrl = await CoolURL.findOne({ slug: slug });
    if (coolUrl && coolUrl.toObject().deletedAt === -1) {
      let clicks: object[] = coolUrl.toObject().clicks;
      clicks.push({
        ip: "",
        time: Date.now()
      });

      await CoolURL.updateOne(
        {
          slug: slug
        },
        { 
          $set: {
            clicks: clicks
          }
        }
      );

      res.json({
        slug: coolUrl.toObject().slug,
        url: coolUrl.toObject().url,
      });
    } else {
      throw new HttpException(404, "Slug not found");
    }
  } catch (error) {
    next(error);
  }
};
