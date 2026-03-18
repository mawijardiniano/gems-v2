import mongoose from "mongoose";
import GemsProfile from "../../models/profile.js";

const MONGO_URI = process.env.MONGODB_URI;

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function updateProgramNames() {
  // Update Information Technology
  const itResult = await GemsProfile.updateMany(
    { "affiliation.academic_information.course": "Information Technology" },
    {
      $set: {
        "affiliation.academic_information.course":
          "Bachelor of Science in Information Technology",
      },
    },
  );

  // Update Information System
  const isResult = await GemsProfile.updateMany(
    { "affiliation.academic_information.course": "Information System" },
    {
      $set: {
        "affiliation.academic_information.course":
          "Bachelor of Science in Information System",
      },
    },
  );

  console.log(
    `Profiles updated: IT=${itResult.modifiedCount}, IS=${isResult.modifiedCount}`,
  );
  mongoose.disconnect();
}

updateProgramNames();
