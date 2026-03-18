import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import GemsProfile from "../../models/profile.js";
import UserAuth from "../../models/user.js";

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  const profilesNoAffAndNoContact = await GemsProfile.find({
    $and: [
      { $or: [{ affiliation: { $exists: false } }, { affiliation: null }] },
      { $or: [{ contact: { $exists: false } }, { contact: null }] },
    ],
  });

  const idsToRemove = profilesNoAffAndNoContact.map((p) => p._id);
  const userAuthResult = await UserAuth.deleteMany({
    personal_info_id: { $in: idsToRemove },
  });
  console.log(
    `Deleted ${userAuthResult.deletedCount} UserAuth records linked to profiles `,
  );

  const profileResult = await GemsProfile.deleteMany({
    _id: { $in: idsToRemove },
  });
  console.log(
    `Deleted ${profileResult.deletedCount} GemsProfile records with NO affiliation AND NO contact.`,
  );

  mongoose.disconnect();
}

run();
