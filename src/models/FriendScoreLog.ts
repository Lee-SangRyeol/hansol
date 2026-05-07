import mongoose from "mongoose";

const friendScoreLogSchema = new mongoose.Schema(
  {
    friendId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Friend",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    updateLog: { type: String, required: true },
    score: { type: Number, required: true, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

friendScoreLogSchema.index({ friendId: 1, createdAt: -1 });

const FriendScoreLog =
  mongoose.models.FriendScoreLog ||
  mongoose.model("FriendScoreLog", friendScoreLogSchema);

export default FriendScoreLog;
