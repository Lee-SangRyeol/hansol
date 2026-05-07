import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/mongodb";
import Friend from "@/models/Friend";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      await connectDB();
      const rouletteQuery =
        typeof req.query.roulette === "string" ? req.query.roulette : undefined;

      if (req.query.id && typeof req.query.id === "string") {
        const friend = await Friend.findById(req.query.id).lean();
        if (!friend) {
          return res.status(404).json({ error: "단짝을 찾을 수 없습니다." });
        }
        return res.status(200).json(friend);
      }

      const filter =
        rouletteQuery === "true"
          ? { roulette: true }
          : rouletteQuery === "false"
          ? { roulette: false }
          : {};

      const friends = await Friend.find(filter)
        .select("_id name members totalScore roulette")
        .sort({ totalScore: -1, createdAt: 1 })
        .lean();

      return res.status(200).json({ friends });
    } catch (error) {
      console.error("Error fetching friends:", error);
      return res.status(500).json({ error: "서버 에러가 발생했습니다." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
