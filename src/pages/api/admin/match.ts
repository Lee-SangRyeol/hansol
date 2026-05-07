import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Friend from "@/models/Friend";
import { isValidAdminPin } from "@/lib/admin";

interface AdminLeanUser {
  _id: string;
  name: string;
  friendId?: string | null;
  partnerUserId?: string | null;
  closeFriends?: string[];
  onboardingCompleted?: boolean;
}

function normalizeFriendName(names: string): string {
  return names.trim();
}

function friendDisplayName(personAName: string, personBName: string): string {
  const sorted = [personAName, personBName].sort((a, b) => a.localeCompare(b));
  return `${sorted[0]}-${sorted[1]}`;
}

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
      const users = (await User.find({})
        .select(
          "_id name friendId partnerUserId closeFriends onboardingCompleted createdAt"
        )
        .sort({ createdAt: 1 })
        .lean()) as unknown as AdminLeanUser[];
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
      const body = req.body as {
        mode?: "manual" | "apply";
        userId1?: string;
        userId2?: string;
        pairs?: { userId1?: string; userId2?: string }[];
      };
      const { mode, userId1, userId2, pairs: applyPairsRaw } = body;

      if (mode === "apply") {
        const pairsPayload = Array.isArray(applyPairsRaw) ? applyPairsRaw : [];
        const sanitized = pairsPayload
          .map((row) => ({
            userId1: String(row.userId1 ?? "").trim(),
            userId2: String(row.userId2 ?? "").trim(),
          }))
          .filter((row) => row.userId1 && row.userId2 && row.userId1 !== row.userId2);

        if (!sanitized.length) {
          return res.status(400).json({ error: "적용할 짝이 없습니다." });
        }

        const seen = new Set<string>();
        for (const row of sanitized) {
          if (seen.has(row.userId1) || seen.has(row.userId2)) {
            return res
              .status(400)
              .json({ error: "동일한 유저가 여러 짝에 포함되어 있습니다." });
          }
          seen.add(row.userId1);
          seen.add(row.userId2);
        }

        for (const row of sanitized) {
          const first = (await User.findById(row.userId1)
            .select("_id name friendId")
            .lean()) as unknown as Pick<AdminLeanUser, "_id" | "name" | "friendId"> | null;
          const second = (await User.findById(row.userId2)
            .select("_id name friendId")
            .lean()) as unknown as Pick<AdminLeanUser, "_id" | "name" | "friendId"> | null;

          if (!first || !second) {
            return res.status(404).json({ error: "존재하지 않는 유저가 포함되어 있습니다." });
          }
          if (first.friendId || second.friendId) {
            return res
              .status(409)
              .json({ error: "이미 단짝이 배정된 유저가 포함되어 있습니다. 새로고침 후 다시 시도하세요." });
          }
        }

        const createdFriendIds: string[] = [];
        for (const row of sanitized) {
          const first = (await User.findById(row.userId1)
            .select("_id name")
            .lean()) as unknown as { _id: string; name: string } | null;
          const second = (await User.findById(row.userId2)
            .select("_id name")
            .lean()) as unknown as { _id: string; name: string } | null;
          if (!first || !second) continue;

          const friendName = normalizeFriendName(
            friendDisplayName(first.name, second.name)
          );
          let friendDoc;
          try {
            friendDoc = await Friend.create({
              name: friendName,
              leader: first.name,
              members: [first.name, second.name],
              memberUserIds: [first._id, second._id],
              totalScore: 0,
              roulette: true,
              matchedAt: new Date(),
            });
          } catch (creationError: unknown) {
            const code =
              typeof creationError === "object" &&
              creationError &&
              "code" in creationError
                ? Number((creationError as { code?: number }).code)
                : 0;
            if (code === 11000) {
              return res.status(409).json({
                error: `단짝 이름 '${friendName}' 이(가) 이미 존재합니다.`,
              });
            }
            throw creationError;
          }

          await User.updateOne(
            { _id: first._id },
            {
              $set: {
                friendId: friendDoc._id,
                partnerUserId: second._id,
                team: friendName,
              },
            }
          );
          await User.updateOne(
            { _id: second._id },
            {
              $set: {
                friendId: friendDoc._id,
                partnerUserId: first._id,
                team: friendName,
              },
            }
          );
          createdFriendIds.push(String(friendDoc._id));
        }

        return res.status(200).json({ success: true, createdFriendIds });
      }

      if (!userId1 || !userId2 || userId1 === userId2) {
        return res.status(400).json({ error: "유효한 두 명의 유저가 필요합니다." });
      }

      const first = (await User.findById(userId1)
        .select("_id name friendId")
        .lean()) as unknown as (Pick<AdminLeanUser, "_id" | "name"> & {
        friendId?: unknown;
      }) | null;
      const second = (await User.findById(userId2)
        .select("_id name friendId")
        .lean()) as unknown as (Pick<AdminLeanUser, "_id" | "name"> & {
        friendId?: unknown;
      }) | null;

      if (!first || !second) {
        return res.status(404).json({ error: "유저를 찾을 수 없습니다." });
      }
      if (first.friendId || second.friendId) {
        return res.status(409).json({ error: "이미 단짝이 배정된 유저입니다." });
      }

      const friendName = normalizeFriendName(friendDisplayName(first.name, second.name));
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
