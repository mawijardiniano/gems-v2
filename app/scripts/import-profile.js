import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import csv from "csvtojson";
import GemsProfile from "../../models/profile.js";
import UserAuth from "../../models/user.js";

const MONGO_URI = process.env.MONGODB_URI;

const csvFile = process.argv[2];

if (!csvFile) {
  console.error("Usage: node scripts/import-profile.js path/to/file.csv");
  process.exit(1);
}

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

csv()
  .fromFile(csvFile)
  .then(async (rows) => {
    for (const row of rows) {
      const personal = {
        first_name: row.first_name,
        middle_name: row.mid_name,
        last_name: row.last_name,
        birthday:
          !row.cbd ||
          row.cbd.trim().toUpperCase() === "NULL" ||
          row.cbd.trim() === "0000-00-00"
            ? null
            : new Date(row.cbd),
        bloodType:
          !row.blood_type || row.blood_type.trim().toUpperCase() === "NULL"
            ? "Unknown"
            : row.blood_type,
        civil_status:
          !row.civil_status ||
          row.civil_status.trim().toUpperCase() === "NULL" ||
          row.civil_status.trim().toLowerCase() === "others"
            ? ""
            : row.civil_status.trim().toLowerCase() === "widowed"
              ? "Widow"
              : row.civil_status,
        nationality: row.citizenship,
        currentStatus: "Employee",
      };

      const gadData = {
        sexAtBirth: row.gender,
      };

      const affiliation = { employment_information: {} };
      const profile = await GemsProfile.create({
        personal,
        gadData,
        affiliation,
      });

      const username = (row.last_name + row.first_name).replace(/\s+/g, "");
      let birthYear = "0000";
      if (
        row.cbd &&
        !/^0000-/.test(row.cbd) &&
        row.cbd.trim().toUpperCase() !== "NULL" &&
        row.cbd.trim() !== "" &&
        !isNaN(Date.parse(row.cbd))
      ) {
        birthYear = new Date(row.cbd).getFullYear().toString();
      }
      const password = "gems1234";
      try {
        await UserAuth.create({
          personal_info_id: profile._id,
          username,
          password,
          role: "User",
        });
      } catch (err) {
        console.error(`Failed to create user for ${username}:`, err.message);
      }
    }
    console.log("Import complete!");
    mongoose.disconnect();
  })
  .catch((err) => {
    console.error(err);
    mongoose.disconnect();
  });
