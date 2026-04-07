import bcrypt from "bcrypt";
import mongoose from "mongoose";

const roleEnum = ["owner", "admin", "member", "viewer"];

const organizationMembershipSchema = new mongoose.Schema(
  {
    orgId: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: roleEnum,
      default: "member",
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: roleEnum,
      default: "member",
      index: true,
    },
    organizations: {
      type: [organizationMembershipSchema],
      default: [],
    },
    authProviders: {
      googleId: {
        type: String,
        unique: true,
        sparse: true,
      },
      githubId: {
        type: String,
        unique: true,
        sparse: true,
      },
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function preSave(next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model("User", userSchema);
