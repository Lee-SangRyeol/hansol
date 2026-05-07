import mongoose from "mongoose";
import { connectDB } from "../../lib/mongodb";
import TeamScore from "../../models/TeamScore";
import Friend from "../../models/Friend";
import FriendScoreLog from "../../models/FriendScoreLog";

async function migrateTeamScoreToFriendScoreLog() {
  await connectDB();

  const teamScores = await TeamScore.find({}).lean();
  let migratedCount = 0;
  let skippedCount = 0;

  for (const teamScore of teamScores) {
    const friend = (await Friend.findOne({ name: teamScore.name })
      .select("_id name")
      .lean()) as { _id?: string } | null;

    if (!friend?._id) {
      skippedCount += 1;
      console.warn(
        `[migrate-teamscore-to-friendscorelog] skipped: friend not found for name=${teamScore.name}`
      );
      continue;
    }

    await FriendScoreLog.create({
      friendId: friend._id,
      name: teamScore.name,
      updateLog: teamScore.updateLog ?? "",
      score: teamScore.score ?? 0,
      createdAt: (teamScore as { createdAt?: Date }).createdAt,
      updatedAt: (teamScore as { updatedAt?: Date }).updatedAt,
    });

    migratedCount += 1;
  }

  console.log(
    `[migrate-teamscore-to-friendscorelog] done. total=${teamScores.length}, migrated=${migratedCount}, skipped=${skippedCount}`
  );
}

migrateTeamScoreToFriendScoreLog()
  .catch((error) => {
    console.error("[migrate-teamscore-to-friendscorelog] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
