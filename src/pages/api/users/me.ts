import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Friend from "@/models/Friend";

interface MeUser {
  _id: string;
  name: string;
  image?: string;
  role?: string;
  onboardingCompleted?: boolean;
  prayerTopic?: string;
  closeFriends?: string[];
  tmi?: string;
  bibleVerse?: string;
  friendId?: string;
  partnerUserId?: string;
}

interface MeFriend {
  _id: string;
  name: string;
  members?: string[];
  totalScore?: number;
  roulette?: boolean;
}

interface MePartner {
  _id: string;
  name: string;
  image?: string;
  prayerTopic?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.sub) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await connectDB();
    const user = (await User.findOne({ snsId: token.sub }).lean()) as MeUser | null;

    if (!user) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    let friend: MeFriend | null = null;
    let partner: MePartner | null = null;

    if (user.friendId) {
      friend = (await Friend.findById(user.friendId)
        .select("_id name members totalScore roulette")
        .lean()) as MeFriend | null;
    }

    if (user.partnerUserId) {
      partner = (await User.findById(user.partnerUserId)
        .select("_id name image prayerTopic")
        .lean()) as MePartner | null;
    } else if (friend && Array.isArray(friend.members)) {
      const partnerName = friend.members.find((member) => member !== user.name);
      if (partnerName) {
        partner = (await User.findOne({ name: partnerName })
          .select("_id name image prayerTopic")
          .lean()) as MePartner | null;
      }
    }

    return res.status(200).json({
      id: user._id,
      name: user.name,
      image: user.image ?? "",
      role: user.role,
      onboardingCompleted: Boolean(user.onboardingCompleted),
      prayerTopic: user.prayerTopic ?? "",
      closeFriends: user.closeFriends ?? [],
      tmi: user.tmi ?? "",
      bibleVerse: user.bibleVerse ?? "",
      friendId: user.friendId ?? null,
      partnerUserId: user.partnerUserId ?? null,
      friend: friend
        ? {
            id: friend._id,
            name: friend.name,
            members: friend.members ?? [],
            totalScore: friend.totalScore ?? 0,
            roulette: Boolean(friend.roulette),
          }
        : null,
      partner: partner
        ? {
            id: partner._id,
            name: partner.name,
            image: partner.image ?? "",
            prayerTopic: partner.prayerTopic ?? "",
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return res.status(500).json({ error: "서버 에러가 발생했습니다." });
  }
}
