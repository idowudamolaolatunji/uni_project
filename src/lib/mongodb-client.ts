import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";

declare global {
  var mongoClient: MongoClient | undefined;
}

const client =
  process.env.NODE_ENV === "development"
    ? (global.mongoClient ??= new MongoClient(uri))
    : new MongoClient(uri);

export default client;
