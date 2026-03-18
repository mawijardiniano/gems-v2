import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import GemsProfile from "../../models/profile.js";
import UserAuth from "../../models/user.js";

const MONGO_URI = process.env.MONGODB_URI;

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function deleteNoGadContact() {
  const profiles = await GemsProfile.find({
    $and: [
      { $or: [{ gadData: { $exists: false } }, { gadData: null }] },
      { $or: [{ contact: { $exists: false } }, { contact: null }] },
    ],
  });

  let deletedProfiles = 0;
  let deletedUsers = 0;

  for (const profile of profiles) {

    const userResult = await UserAuth.deleteMany({
      personal_info_id: profile._id,
    });
    deletedUsers += userResult.deletedCount || 0;

    await GemsProfile.deleteOne({ _id: profile._id });
    deletedProfiles++;
  }

  console.log(`Deleted profiles: ${deletedProfiles}`);
  console.log(`Deleted linked user auths: ${deletedUsers}`);
  mongoose.disconnect();
}

deleteNoGadContact();
