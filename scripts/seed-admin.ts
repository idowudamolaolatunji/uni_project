import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectToDatabase } from "../src/lib/mongodb";
import { UserModel } from "../src/lib/models/User";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables before running this script."
    );
    process.exit(1);
  }

  await connectToDatabase();

  const normalizedEmail = email.toLowerCase();
  const existing = await UserModel.findOne({ email: normalizedEmail });

  if (existing) {
    if (existing.role !== "admin") {
      existing.role = "admin";
      await existing.save();
      console.log(`Updated existing user ${normalizedEmail} to the admin role.`);
    } else {
      console.log(`Admin user ${normalizedEmail} already exists.`);
    }
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    await UserModel.create({
      email: normalizedEmail,
      passwordHash,
      role: "admin",
    });
    console.log(`Created admin user ${normalizedEmail}.`);
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
