import jwt from "jsonwebtoken";

export const signToken = (payload) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not defined");
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });
};

export const verifyToken = (token) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not defined");
  return jwt.verify(token, process.env.JWT_SECRET);
};
