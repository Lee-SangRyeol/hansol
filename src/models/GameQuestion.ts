import mongoose from "mongoose";

const gameQuestionSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true },
    text: { type: String, required: true },
    category: { type: String, default: "" },
    isActive: { type: Boolean, required: true, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

gameQuestionSchema.index({ category: 1, number: 1 }, { unique: true });

const GameQuestion =
  mongoose.models.GameQuestion ||
  mongoose.model("GameQuestion", gameQuestionSchema);

export default GameQuestion;
