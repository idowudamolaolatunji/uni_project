import { Schema, model, models, type InferSchemaType } from "mongoose";

const MIN_ABSTRACT_WORDS = 40;
const MIN_TAGS = 3;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeTags(values: string[]): string[] {
  return values.map((value) => value.trim().toLowerCase());
}

const resourceSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    abstract: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value: string) => countWords(value) >= MIN_ABSTRACT_WORDS,
        message: `Abstract must be at least ${MIN_ABSTRACT_WORDS} words.`,
      },
    },
    courseCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    tags: {
      type: [String],
      default: [],
      set: normalizeTags,
      validate: {
        validator: (values: string[]) => values.length >= MIN_TAGS,
        message: `At least ${MIN_TAGS} tags are required.`,
      },
    },
    fileUrl: {
      type: String,
      required: true,
    },
    cloudinaryId: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tfidfVector: {
      type: Map,
      of: Number,
      default: () => new Map(),
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type Resource = InferSchemaType<typeof resourceSchema>;

export const ResourceModel = models.Resource ?? model("Resource", resourceSchema);
