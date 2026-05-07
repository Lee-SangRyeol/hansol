import mongoose from "mongoose";

const friendSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    leader: { type: String, required: true },
    members: [{ type: String }],
    memberUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    totalScore: { type: Number, required: true, default: 0 },
    roulette: { type: Boolean, required: true, default: true },
    matchedAt: { type: Date },
  },
  { timestamps: true }
);

friendSchema.index({ roulette: 1 });

const Friend = mongoose.models.Friend || mongoose.model("Friend", friendSchema);

export default Friend;
