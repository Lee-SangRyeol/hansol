import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import GameQuestion from "@/models/GameQuestion";
import User from "@/models/User";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      await connectDB();
      const category =
        typeof req.query.category === "string" ? req.query.category : undefined;

      const filter = category ? { category, isActive: true } : { isActive: true };
      const questions = await GameQuestion.find(filter)
        .select("_id number text category isActive")
        .sort({ category: 1, number: 1, createdAt: 1 })
        .lean();

      return res.status(200).json({ questions });
    } catch (error) {
      console.error("Questions fetch error:", error);
      return res.status(500).json({ error: "문제 조회에 실패했습니다." });
    }
  }

  if (req.method === "POST") {
    try {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token?.sub) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await connectDB();
      const admin = (await User.findOne({ snsId: token.sub })
        .select("_id role")
        .lean()) as { _id: string; role: string } | null;
      if (!admin || admin.role !== "admin") {
        return res.status(403).json({ error: "관리자만 문제를 등록할 수 있습니다." });
      }

      const { number, text, category, isActive } = req.body as {
        number?: number;
        text?: string;
        category?: string;
        isActive?: boolean;
      };

      if (!text || !category) {
        return res.status(400).json({ error: "text와 category는 필수입니다." });
      }

      const created = await GameQuestion.create({
        number: Number(number ?? 0),
        text: String(text).trim(),
        category: String(category).trim(),
        isActive: isActive ?? true,
        createdBy: admin._id,
      });

      return res.status(201).json({ question: created });
    } catch (error) {
      console.error("Question create error:", error);
      return res.status(500).json({ error: "문제 등록에 실패했습니다." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
