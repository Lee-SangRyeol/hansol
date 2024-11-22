import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true,unique: true },
    snsId: { type: String, required: true, unique: true },
    role:{type:String,required: true, default:"user" },
    team:{type:String,required: true, default:"" },
    score:{type:Number,required: true, default:0 },
    image: { type: String },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
