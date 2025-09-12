import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      await connectDB();

      // name 쿼리 파라미터가 있는 경우 특정 유저 검색
      if (req.query.name) {
        const user = await User.findOne({ name: req.query.name });
        if (!user) {
          return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
        }
        // name, score, team, tmi 반환
        return res.status(200).json({
          name: user.name,
          score: user.score,
          team: user.team,
          tmi: user.tmi,
        });
      }

      // names 쿼리 파라미터로 여러 유저 검색
      if (req.query.names) {
        const names = (req.query.names as string).split(",");
        const users = await User.find({ name: { $in: names } });
        // 각 유저의 name과 score만 반환
        const scores = Object.fromEntries(
          users.map((user) => [user.name, user.score || 0])
        );
        return res.status(200).json(scores);
      }

      // 쿼리 파라미터가 없는 경우 모든 유저 반환
      const users = await User.find({});
      return res.status(200).json({ users });
    } catch (error) {
      console.error("Error fetching user data:", error);
      return res.status(500).json({ error: "서버 에러가 발생했습니다." });
    }
  }

  if (req.method === "POST") {
    try {
      await connectDB();
      const user = await User.create(req.body);
      return res.status(201).json({ user });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ error: "사용자 생성 실패" });
    }
  }

  if (req.method === "PUT") {
    try {
      await connectDB();
      const { name, tmi, snsId } = req.body;

      console.log("PUT 요청 데이터:", { name, tmi, snsId });

      if (!name) {
        return res.status(400).json({ error: "사용자 이름이 필요합니다." });
      }

      // 모든 사용자 확인 (디버깅용)
      const allUsers = await User.find({}, "name snsId tmi");
      console.log("모든 사용자:", allUsers);

      // 먼저 name으로 검색
      let user = await User.findOneAndUpdate(
        { name },
        { tmi: tmi || "" },
        { new: true, runValidators: false }
      );

      console.log("name으로 검색한 결과:", user);

      // name으로 찾지 못했다면 snsId로 검색 시도
      if (!user && snsId) {
        user = await User.findOneAndUpdate(
          { snsId },
          { tmi: tmi || "" },
          { new: true, runValidators: false }
        );
        console.log("snsId로 검색한 결과:", user);
      }

      if (!user) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
      }

      return res.status(200).json({ success: true, user });
    } catch (error) {
      console.error("Error updating user TMI:", error);
      return res.status(500).json({ error: "TMI 업데이트 실패" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
