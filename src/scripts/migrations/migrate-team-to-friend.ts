import mongoose from "mongoose";
import { connectDB } from "../../lib/mongodb";
import Team from "../../models/Team";
import Friend from "../../models/Friend";

async function migrateTeamToFriend() {
  await connectDB();

  const teams = await Team.find({}).lean();
  let createdCount = 0;
  let updatedCount = 0;

  for (const team of teams) {
    const payload = {
      name: team.name,
      leader: team.leader,
      members: team.members ?? [],
      totalScore: team.totalScore ?? 0,
      roulette: true,
      matchedAt: (team as { createdAt?: Date }).createdAt,
    };

    const result = await Friend.updateOne(
      { name: team.name },
      { $set: payload },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      createdCount += 1;
    } else if (result.modifiedCount > 0) {
      updatedCount += 1;
    }
  }

  console.log(
    `[migrate-team-to-friend] done. total=${teams.length}, created=${createdCount}, updated=${updatedCount}`
  );
}

migrateTeamToFriend()
  .catch((error) => {
    console.error("[migrate-team-to-friend] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
