import mongoose from "mongoose";

const characterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    instructions: [{ type: String, required: true }],
    image: { type: String, required: true },
    order: { type: Number, required: true },
    isSpecial: { type: Boolean, default: false }, // 야곱/라헬 같은 특별한 경우
    specialInstructions: [{ type: String }], // 야곱의 두 번째 지령 등
    isUsed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Character =
  mongoose.models.Character || mongoose.model("Character", characterSchema);

export default Character;
