import mongoose from "mongoose";

const scoreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    updateLog:{type:String},
    score:{type:Number,required: true, default:0 },
  },
  { timestamps: true }
);

const Score = mongoose.models.Score || mongoose.model("Score", scoreSchema);

export default Score; 