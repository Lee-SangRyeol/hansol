import { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/mongodb";
import Character from "@/models/Character";
import User from "@/models/User";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    // 기존 GET 로직
    try {
      await connectDB();

      const { name } = req.query;
      console.log("Character에서 name : ", name);

      if (name) {
        // 1. 사용자 조회
        const user = await User.findOne({ name: name as string });
        if (!user) {
          return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
        }

        // 2. 사용자의 character 값으로 Character 테이블 조회
        if (!user.character) {
          return res
            .status(404)
            .json({ error: "사용자에게 배정된 캐릭터가 없습니다." });
        }

        const character = await Character.findOne({ name: user.character });
        if (!character) {
          return res.status(404).json({ error: "캐릭터를 찾을 수 없습니다." });
        }

        return res.status(200).json(character);
      } else {
        // 모든 캐릭터 조회 (순서대로)
        const characters = await Character.find({}).sort({ order: 1 });
        return res.status(200).json(characters);
      }
    } catch (error) {
      console.error("Character fetch error:", error);
      return res
        .status(500)
        .json({ error: "캐릭터 데이터 조회 중 오류가 발생했습니다." });
    }
  } else if (req.method === "POST") {
    // 역할 배정 POST 로직
    try {
      await connectDB();
      const { userName, characterName } = req.body as {
        userName?: string;
        characterName?: string;
      };

      if (!userName) {
        return res.status(400).json({ error: "userName is required" });
      }

      const user = await User.findOne({ name: userName });
      if (!user)
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });

      let pickedName = characterName;

      if (!pickedName) {
        // isUsed가 false인 역할 중 랜덤 배정
        const available = await Character.find({ isUsed: false })
          .sort({ order: 1 })
          .lean();
        if (!available.length) {
          return res
            .status(400)
            .json({ error: "배정 가능한 캐릭터가 없습니다." });
        }
        const rnd = Math.floor(Math.random() * available.length);
        pickedName = available[rnd].name;
      } else {
        // 특정 캐릭터 배정: 사용 가능 여부 체크
        const exists = await Character.findOne({ name: pickedName });
        if (!exists)
          return res.status(404).json({ error: "캐릭터를 찾을 수 없습니다." });
        if (exists.isUsed)
          return res
            .status(409)
            .json({ error: "이미 사용 중인 캐릭터입니다." });
      }

      // 사용자에 캐릭터 저장
      user.character = pickedName;
      await user.save();

      // 캐릭터 사용 처리
      await Character.updateOne(
        { name: pickedName },
        { $set: { isUsed: true } }
      );

      const character = await Character.findOne({ name: pickedName });
      return res.status(200).json({ success: true, character });
    } catch (error) {
      console.error("Character assign error:", error);
      return res
        .status(500)
        .json({ error: "역할 배정 중 오류가 발생했습니다." });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
