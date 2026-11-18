import mongoose, { Schema } from "mongoose";
import { roundCentavos } from "../data/lib/gaaBudgetInput.js";

const gaaBudgetSchema = new Schema({
  year: { type: Number, required: true,   unique: true, },
  totalGAA: { type: Number, required: true },
  gadPercent: { type: Number, default: 5 },
  gadAnnualBudget: { type: Number },
  enteredBy: { type: Schema.Types.ObjectId, ref: "UserAuth", required: true },
  createdAt: { type: Date, default: Date.now },
});

/* Rounded to centavos: the raw product (87,654,321 × 7% = 6135802.470000001)
   made a plan that used the budget exactly read "Over budget by ₱0.00". */
gaaBudgetSchema.pre("save", function () {
  this.gadAnnualBudget = roundCentavos(this.totalGAA * (this.gadPercent / 100));
});

export default mongoose.models.GAABudget ||
  mongoose.model("GAABudget", gaaBudgetSchema);
