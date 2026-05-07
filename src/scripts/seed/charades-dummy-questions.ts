/**
 * 몸으로 말해요용 GameQuestion 더미 데이터(카테고리당 20문항, 총 160문항)를 DB에 upsert합니다.
 *
 * 실행: npm run seed:charades-dummy
 */
import mongoose from "mongoose";
import { connectDB } from "../../lib/mongodb";
import GameQuestion from "../../models/GameQuestion";
import { CHARADES_DUMMY_QUESTIONS } from "../../data/charadesDummyQuestions";

async function main(): Promise<void> {
  await connectDB();

  const ops = CHARADES_DUMMY_QUESTIONS.map((row) => ({
    updateOne: {
      filter: { category: row.category, number: row.number },
      update: {
        $set: {
          text: row.text,
          category: row.category,
          number: row.number,
          isActive: true,
        },
      },
      upsert: true,
    },
  }));

  const res = await GameQuestion.bulkWrite(ops, { ordered: false });

  console.log("charades dummy seed:", {
    upsertedCount: res.upsertedCount,
    modifiedCount: res.modifiedCount,
    matchedCount: res.matchedCount,
    totalDocs: CHARADES_DUMMY_QUESTIONS.length,
  });

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
