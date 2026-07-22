import { Schema, model, models, type InferSchemaType } from "mongoose";

function normalizeTags(values: string[]): string[] {
  return values.map((value) => value.trim().toLowerCase());
}

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["student", "admin"],
      required: true,
      default: "student",
    },
    interests: {
      type: [String],
      default: [],
      set: normalizeTags,
    },
    courseCodes: {
      type: [String],
      default: [],
      set: normalizeTags,
    },
    tags: {
      type: [String],
      default: [],
      set: normalizeTags,
    },
    resetPasswordTokenHash: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type User = InferSchemaType<typeof userSchema>;

export const UserModel = models.User ?? model("User", userSchema);
