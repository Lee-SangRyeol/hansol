import mongoose from "mongoose";
import { connectDB } from "../../lib/mongodb";
import User from "../../models/User";
import Friend from "../../models/Friend";

async function migrateUserTeamToFriendId() {
  await connectDB();

  const users = await User.find({
    team: { $exists: true, $ne: "" },
  })
    .select("_id name team friendId partnerUserId")
    .lean();

  let linkedCount = 0;
  let skippedCount = 0;
  let partnerLinkedCount = 0;

  for (const user of users) {
    const friend = (await Friend.findOne({ name: user.team })
      .select("_id members")
      .lean()) as { _id?: mongoose.Types.ObjectId; members?: string[] } | null;

    if (!friend?._id) {
      skippedCount += 1;
      console.warn(
        `[migrate-user-team-to-friendid] skipped: friend not found for team=${user.team}, user=${user.name}`
      );
      continue;
    }

    let partnerUserId: mongoose.Types.ObjectId | undefined;
    const members = Array.isArray(friend.members) ? friend.members : [];
    const partnerName = members.find((member) => member !== user.name);

    if (partnerName) {
      const partnerUser = (await User.findOne({ name: partnerName })
        .select("_id")
        .lean()) as { _id?: mongoose.Types.ObjectId } | null;
      if (partnerUser?._id) {
        partnerUserId = partnerUser._id as mongoose.Types.ObjectId;
      }
    }

    const updatePayload: {
      friendId: mongoose.Types.ObjectId;
      partnerUserId?: mongoose.Types.ObjectId;
    } = {
      friendId: friend._id as mongoose.Types.ObjectId,
    };

    if (partnerUserId) {
      updatePayload.partnerUserId = partnerUserId;
      partnerLinkedCount += 1;
    }

    await User.updateOne({ _id: user._id }, { $set: updatePayload });
    linkedCount += 1;
  }

  console.log(
    `[migrate-user-team-to-friendid] done. total=${users.length}, linked=${linkedCount}, partnerLinked=${partnerLinkedCount}, skipped=${skippedCount}`
  );
}

migrateUserTeamToFriendId()
  .catch((error) => {
    console.error("[migrate-user-team-to-friendid] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
