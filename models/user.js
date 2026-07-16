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
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: [
        "User",
        "Admin",
        "GAD Focal Person",
        "SUC President",
        "GAD Coordinator",
        "ICTU Director",
        "Planning Director",
        "Dean",
        "Campus Director",
      ],
      default: "User",
    },
    assignedCollege: {
      type: String,
      default: null,
      validate: {
        validator: function (v) {
          if (this.role === "Dean" || this.role === "GAD Coordinator") {
            return !!v;
          }
          return true;
        },
        message:
          "assignedCollege is required for users with role Dean or GAD Coordinator",
      },
    },
    is_active: {
      type: Boolean,
      default: true,
    },

    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    created_by: {
      type: Schema.Types.ObjectId,
      ref: "UserAuth",
      default: null,
    },
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: "UserAuth",
      default: null,
    },
  },
  { timestamps: true }
);

userAuthSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  if (!this.isNew) {
    this.passwordChangedAt = new Date(Date.now() - 1000);
  }

  next();
});

userAuthSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userAuthSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userAuthSchema.methods.incrementLoginAttempts = async function () {
  const MAX_ATTEMPTS = 5;
  const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

  const Model = this.model("UserAuth");

  if (this.lockUntil && this.lockUntil < Date.now()) {
    return Model.updateOne(
      { _id: this._id },
      { $set: { loginAttempts: 1, lockUntil: null } }
    );
  }

  const update = { $inc: { loginAttempts: 1 } };

  if (this.loginAttempts + 1 >= MAX_ATTEMPTS && !this.isLocked()) {
    update.$set = { lockUntil: new Date(Date.now() + LOCK_TIME) };
  }

  return Model.updateOne({ _id: this._id }, update);
};

//Reset login attempt
userAuthSchema.methods.resetLoginAttempts = async function () {
  return this.model("UserAuth").updateOne(
    { _id: this._id },
    { $set: { loginAttempts: 0, lockUntil: null, lastLogin: new Date() } }
  );
};

userAuthSchema.index({ role: 1 });
userAuthSchema.index({ is_active: 1 });

export default mongoose.models.UserAuth ||
  mongoose.model("UserAuth", userAuthSchema);