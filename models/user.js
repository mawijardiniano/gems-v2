// import mongoose from "mongoose";
// import bcrypt from "bcryptjs";

// const UserSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     email: { type: String, required: true, unique: true },
//     password: { type: String, required: true, minlength: 8, },
//     role: { type: String, enum: ["User", "Admin"], default: "User" },
//   },
//   { timestamps: true }
// );

// UserSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// UserSchema.methods.matchPassword = async function (enteredPassword) {
//   return await bcrypt.compare(enteredPassword, this.password);
// };

// export default mongoose.models.User || mongoose.model("User", UserSchema);


import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

const userAuthSchema = new Schema(
  {
    personal_info_id: {
      type: Schema.Types.ObjectId,
      ref: "GemsProfile",
      required: false,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["User", "Admin", "Focal"],
      default: "User",
    },
  },
  { timestamps: true }
);

userAuthSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userAuthSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.models.UserAuth ||
  mongoose.model("UserAuth", userAuthSchema);
