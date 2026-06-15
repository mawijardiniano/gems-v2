import mongoose, { Schema } from "mongoose";

const gaaBudgetSchema = new Schema({
  year: { type: Number, required: true,   unique: true, },
  totalGAA: { type: Number, required: true },
  gadPercent: { type: Number, default: 5 },
  gadAnnualBudget: { type: Number },
  enteredBy: { type: Schema.Types.ObjectId, ref: "UserAuth", required: true },
  createdAt: { type: Date, default: Date.now },
});

gaaBudgetSchema.pre("save", function (next) {
  this.gadAnnualBudget = this.totalGAA * (this.gadPercent / 100);
  next();
});

export default mongoose.models.GAABudget ||
  mongoose.model("GAABudget", gaaBudgetSchema);
