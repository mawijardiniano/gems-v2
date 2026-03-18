import mongoose from "mongoose";
import csv from "csvtojson";
import GemsProfile from "../models/profile.js";

const MONGO_URI = "mongodb://localhost:27017/yourdb"; 

const type = process.argv[2];
const csvFile = process.argv[3];

if (!type || !csvFile) {
  console.error(
    "Usage: node scripts/import-profiles.js student|employee path/to/file.csv",
  );
  process.exit(1);
}

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

csv()
  .fromFile(csvFile)
  .then(async (rows) => {
    const docs = rows.map((row) => {
    
      const personal = {
        first_name: row.FirstName,
        last_name: row.LastName,
        birthday: row.Birthday,
        currentStatus: type === "student" ? "Student" : "Employee",
      
      };
    
      const gadData = {
        sexAtBirth: row.Sex,
        genderPreference: row.GenderPreference,
       
      };
 
      const affiliation = {};
      if (type === "student") {
        affiliation.academic_information = {
          college: row.College,
          year_level: row.YearLevel,
          course: row.Course,
        
        };
      } else if (type === "employee") {
        affiliation.employment_information = {
          office: row.Office,
          position: row.Position,
        };
      }

      const contact = {
        email: row.Email,
        mobileNumber: row.MobileNumber,
       
      };
      return {
        personal,
        gadData,
        affiliation,
        contact,
      };
    });
    await GemsProfile.insertMany(docs);
    console.log("Import complete!");
    mongoose.disconnect();
  })
  .catch((err) => {
    console.error(err);
    mongoose.disconnect();
  });
