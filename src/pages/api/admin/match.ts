import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Friend from "@/models/Friend";
import { isValidAdminPin } from "@/lib/admin";

function validatePin(req: NextApiRequest, res: NextApiResponse) {
  const pin = (req.headers["x-admin-pin"] as string | undefined) || "";
  if (!isValidAdminPin(pin)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!validatePin(req, res)) return;

  if (req.method === "GET") {
    try {
      await connectDB();
      const users = await User.find({})
        .select("_id name friendId")
        .sort({ createdAt: 1 })
        .lean();
      const friends = await Friend.find({})
        .select("_id name members totalScore roulette")
        .sort({ createdAt: 1 })
        .lean();
      return res.status(200).json({ users, friends });
    } catch (error) {
      console.error("Admin match GET error:", error);
      return res.status(500).json({ error: "서버 에러가 발생했습니다." });
    }
  }

  if (req.method === "POST") {
    try {
      await connectDB();
      const { mode, userId1, userId2 } = req.body as {
        mode?: "manual" | "auto";
        userId1?: string;
        userId2?: string;
      };

      if (mode === "auto") {
        const unmatched = await User.find({
          $or: [{ friendId: { $exists: false } }, { friendId: null }],
        })
          .select("_id name")
          .sort({ createdAt: 1 })
          .lean();

        const createdFriendIds: string[] = [];
        for (let index = 0; index + 1 < unmatched.length; index += 2) {
          const first = unmatched[index];
          const second = unmatched[index + 1];
          const friendName = `${first.name}-${second.name}`;
          const friend = await Friend.create({
            name: friendName,
            leader: first.name,
            members: [first.name, second.name],
            memberUserIds: [first._id, second._id],
            totalScore: 0,
            roulette: true,
            matchedAt: new Date(),
          });

          await User.updateOne(
            { _id: first._id },
            { $set: { friendId: friend._id, partnerUserId: second._id, team: friendName } }
          );
          await User.updateOne(
            { _id: second._id },
            { $set: { friendId: friend._id, partnerUserId: first._id, team: friendName } }
          );
          createdFriendIds.push(String(friend._id));
        }

        return res.status(200).json({ success: true, createdFriendIds });
      }

      if (!userId1 || !userId2 || userId1 === userId2) {
        return res.status(400).json({ error: "유효한 두 명의 유저가 필요합니다." });
      }

      const first = await User.findById(userId1).select("_id name").lean();
      const second = await User.findById(userId2).select("_id name").lean();

      if (!first || !second) {
        return res.status(404).json({ error: "유저를 찾을 수 없습니다." });
      }

      const friendName = `${first.name}-${second.name}`;
      const friend = await Friend.create({
        name: friendName,
        leader: first.name,
        members: [first.name, second.name],
        memberUserIds: [first._id, second._id],
        totalScore: 0,
        roulette: true,
        matchedAt: new Date(),
      });

      await User.updateOne(
        { _id: first._id },
        { $set: { friendId: friend._id, partnerUserId: second._id, team: friendName } }
      );
      await User.updateOne(
        { _id: second._id },
        { $set: { friendId: friend._id, partnerUserId: first._id, team: friendName } }
      );

      return res.status(201).json({ success: true, friendId: String(friend._id) });
    } catch (error) {
      console.error("Admin match POST error:", error);
      return res.status(500).json({ error: "매칭 처리에 실패했습니다." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
