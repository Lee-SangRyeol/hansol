import mongoose from "mongoose";

const teamScoreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    updateLog:{type:String},
    score:{type:Number,required: true, default:0 },
  },
  { timestamps: true }
);

const TeamScore = mongoose.models.TeamScore || mongoose.model("TeamScore", teamScoreSchema);

export default TeamScore; 