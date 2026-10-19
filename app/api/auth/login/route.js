import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import UserAuth from "@/models/user";
import GemsProfile from "@/models/profile";
import { logActivity } from "@/lib/activityLog";
import Notification from "@/models/notification";
import { rateLimiters } from "@/lib/rateLimit";
import { usernameEqualsFilter } from "@/lib/usernames";
import { resolvePii } from "@/lib/profileBroker";

const JWT_SECRET = process.env.JWT_SECRET;

const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";

export async function POST(req) {
  try {

    const rateLimitResult = await rateLimiters.login(req);
    if (rateLimitResult.error) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        { status: rateLimitResult.status, headers: rateLimitResult.headers }
      );
    }

    await connectDB();
    const { username, password } = await req.json();

    const loginUsername = String(username || "").trim();
    let user = await UserAuth.findOne({ username: loginUsername }).select("+password");
    // Fallback so pre-normalization logins (e.g. 24b0128) still work after fix (24B0128).
    if (!user && loginUsername) {
      user = await UserAuth.findOne(usernameEqualsFilter(loginUsername)).select("+password");
    }

    if (!user) {
      await logActivity({
        user_id: null,
        action: "LOGIN_FAILED",
        description: `Login failed - invalid credentials for username: ${username}`,
        req,
        metadata: { module: "auth", username },
        resource_type: "user",
        severity: "warning",
      });

      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    if (user.isLocked()) {
      const lockTimeRemaining = Math.ceil(
        (user.lockUntil - Date.now()) / 1000 / 60,
      );

      await logActivity({
        user_id: user._id,
        action: "LOGIN_FAILED",
        description: `Login blocked - account locked for ${lockTimeRemaining} minutes`,
        req,
        metadata: { module: "auth", lockTimeRemaining },
        resource_type: "user",
        resource_id: user._id,
        severity: "warning",
      });

      return NextResponse.json(
        {
          error: `Account temporarily locked. Try again in ${lockTimeRemaining} minutes.`,
        },
        { status: 429 },
      );
    }

    if (user.is_active === false) {
      await logActivity({
        user_id: user._id,
        action: "LOGIN_FAILED",
        description: "Login blocked - account deactivated",
        req,
        metadata: { module: "auth" },
        resource_type: "user",
        resource_id: user._id,
        severity: "warning",
      });

      return NextResponse.json(
        { error: "Account is deactivated. Contact administrator." },
        { status: 403 },
      );
    }

    const isValid = await user.matchPassword(password);
    if (!isValid) {
      await user.incrementLoginAttempts();

      await logActivity({
        user_id: user._id,
        action: "LOGIN_FAILED",
        description: `Login failed - invalid password (attempt ${user.loginAttempts})`,
        req,
        metadata: {
          module: "auth",
          loginAttempts: user.loginAttempts,
        },
        resource_type: "user",
        resource_id: user._id,
        severity: "warning",
      });

      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    await user.resetLoginAttempts();

    await logActivity({
      user_id: user._id,
      action: "LOGIN",
      description: `Account logged in successfully`,
      req,
      metadata: { module: "auth", role: user.role },
      resource_type: "user",
      resource_id: user._id,
      severity: "info",
    });

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        assignedCollege: user.assignedCollege,
        passwordChangedAt: user.passwordChangedAt?.getTime(),
      },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    const profile = await GemsProfile.findById(user.personal_info_id).lean();

    /* The identity lives in the vault; `GemsProfile` keeps only the pointer and
       the GEMS-owned fields. Read the vault first and fall back to the legacy
       blocks so a profile still mid-migration keeps behaving as before. The
       resolved identity is used only to compute `missingFields` — it must never
       travel back to the client (see the payload below). */
    let missingFields = [];
    try {
      let identity = profile;
      if (profile?.vaultRef) {
        const resolved = await resolvePii({
          vaultRef: profile.vaultRef,
          role: user.role,
        });
        if (resolved?.raw) {
          identity = {
            ...profile,
            personal: { ...(profile.personal || {}), ...(resolved.raw.personal || {}) },
            gadData: { ...(profile.gadData || {}), ...(resolved.raw.gadData || {}) },
            contact: { ...(profile.contact || {}), ...(resolved.raw.contact || {}) },
          };
        }
      }

      if (identity) {
        const personal = identity.personal || {};
        const contact = identity.contact || {};
        const affiliation = identity.affiliation || {};
        const academic = affiliation.academic_information || {};
        const employment = affiliation.employment_information || {};

        const gadData = identity.gadData || {};

        // Check required personal fields
        if (!personal.first_name) missingFields.push("First Name");
        if (!personal.last_name) missingFields.push("Last Name");
        if (!personal.currentStatus) missingFields.push("Status (Student/Employee)");
        if (!personal.birthday) missingFields.push("Birthday");
        if (!personal.civil_status) missingFields.push("Civil Status");
        if (!gadData.sexAtBirth) missingFields.push("Sex at Birth");

        // Check contact fields
        if (!contact.email) missingFields.push("Email");
        if (!contact.mobileNumber) missingFields.push("Mobile Number");

        // Check academic/employment fields based on status
        if (personal.currentStatus === "Student") {
          if (!academic.campus) missingFields.push("Campus");
          if (!academic.college) missingFields.push("College");
          if (!academic.course) missingFields.push("Course");
          if (!academic.year_level) missingFields.push("Year Level");
          if (!academic.student_id) missingFields.push("Student ID");
        } else if (personal.currentStatus === "Employee") {
          if (!employment.office) missingFields.push("Office");
          if (!employment.employment_status) missingFields.push("Employment Status");
          if (!employment.employment_appointment_status) missingFields.push("Appointment Status");
          if (!employment.employee_id) missingFields.push("Employee ID");
        }
      } else {
        missingFields.push("No profile exists");
      }

      // Create notification for missing profile fields
      if (missingFields.length > 0) {
        const existingMissingNotif = await Notification.findOne({
          recipientId: user._id,
          type: "profile_missing_fields",
          isRead: false,
        });

        if (!existingMissingNotif) {
          await Notification.create({
            recipientId: user._id,
            senderId: user._id,
            type: "profile_missing_fields",
            title: "Complete Your Profile",
            message: `Your profile is missing the following required fields: ${missingFields.join(", ")}. Please update your profile to complete your registration.`,
            metadata: { missingFields },
          });

          if (global.io) {
            global.io.emit("notification:new", {
              recipientId: String(user._id),
              notification: {
                _id: "pending",
                type: "profile_missing_fields",
                title: "Complete Your Profile",
                message: `Your profile is missing the following required fields: ${missingFields.join(", ")}. Please update your profile to complete your registration.`,
                isRead: false,
                createdAt: new Date().toISOString(),
              },
            });
          }
        }
      }

      if (!user.passwordChangedAt) {
        const existingPwdNotif = await Notification.findOne({
          recipientId: user._id,
          type: "password_not_changed",
          isRead: false,
        });

        if (!existingPwdNotif) {
          await Notification.create({
            recipientId: user._id,
            senderId: user._id,
            type: "password_not_changed",
            title: "Change Your Password",
            message: "For security purposes, please change your default password. Go to Settings to update your password.",
            metadata: {},
          });

          if (global.io) {
            global.io.emit("notification:new", {
              recipientId: String(user._id),
              notification: {
                _id: "pending",
                type: "password_not_changed",
                title: "Change Your Password",
                message: "For security purposes, please change your default password. Go to Settings to update your password.",
                isRead: false,
                createdAt: new Date().toISOString(),
              },
            });
          }
        }
      }
    } catch (notifError) {
      console.error("Failed to create login notifications:", notifError);
    }

    const userObj = user.toObject();
    const { password: _, ...userWithoutPassword } = userObj;

    const res = NextResponse.json({
      success: true,
      user: userWithoutPassword,
      missingFields,
    });

    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });

    return res;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
