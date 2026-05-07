import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    snsId: { type: String, required: true, unique: true },
    role: { type: String, required: true, default: "user" },
    team: { type: String, required: true, default: "" },
    score: { type: Number, required: true, default: 0 },
    image: { type: String },
    character: { type: String, required: true, default: "" },
    tmi: { type: String, default: "" },
    prayerTopic: { type: String, default: "" },
    closeFriends: [{ type: String }],
    bibleVerse: { type: String, default: "" },
    onboardingCompleted: { type: Boolean, required: true, default: false },
    friendId: { type: mongoose.Schema.Types.ObjectId, ref: "Friend" },
    partnerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

userSchema.index({ friendId: 1 });

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
