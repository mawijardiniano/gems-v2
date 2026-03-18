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
    const students = {};
    for (const row of rows) {
      const key = (row.StudentNo || "").trim().toUpperCase();
      if (!students[key]) {
        students[key] = row;
      }
    }
    for (const key in students) {
      const row = students[key];
      const personal = {
        first_name: row.FirstName,
        middle_name: row.MiddleName,
        last_name: row.LastName,
        currentStatus: "Student",
      };

      const affiliation = {
        academic_information: {
          student_id: row.StudentNo,
          college: row.CollegeName
            ? row.CollegeName.replace(/ and /gi, " & ")
            : undefined,
          year_level: row.YearLevel,
          course: row.ProgName,
        },
      };
      const profile = await GemsProfile.create({
        personal,
        affiliation,
      });

      const username = row.StudentNo;
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
