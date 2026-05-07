import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

const MAX_TEXT_LENGTH = 500;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.sub) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const prayerTopic = String(req.body?.prayerTopic ?? "").trim();
    const closeFriends = Array.isArray(req.body?.closeFriends)
      ? req.body.closeFriends
          .map((name: unknown) => String(name ?? "").trim())
          .filter(Boolean)
      : [];
    const tmi = String(req.body?.tmi ?? "").trim();
    const bibleVerse = String(req.body?.bibleVerse ?? "").trim();

    if (!prayerTopic || !tmi || !bibleVerse) {
      return res.status(400).json({ error: "필수 입력값이 누락되었습니다." });
    }

    if (
      prayerTopic.length > MAX_TEXT_LENGTH ||
      tmi.length > MAX_TEXT_LENGTH ||
      bibleVerse.length > MAX_TEXT_LENGTH
    ) {
      return res.status(400).json({ error: "입력 길이 제한을 초과했습니다." });
    }

    if (closeFriends.length !== 3 || new Set(closeFriends).size !== 3) {
      return res
        .status(400)
        .json({ error: "친한사람은 중복 없이 3명을 선택해야 합니다." });
    }

    await connectDB();
    const updated = await User.findOneAndUpdate(
      { snsId: token.sub },
      {
        $set: {
          prayerTopic,
          closeFriends,
          tmi,
          bibleVerse,
          onboardingCompleted: true,
        },
      },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating onboarding:", error);
    return res.status(500).json({ error: "온보딩 저장에 실패했습니다." });
  }
}
