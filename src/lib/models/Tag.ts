import { Schema, model, models, type InferSchemaType } from "mongoose";

const tagSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type Tag = InferSchemaType<typeof tagSchema>;

export const TagModel = models.Tag ?? model("Tag", tagSchema);
