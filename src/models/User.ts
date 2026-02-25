import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export type UserRole = "super_admin" | "admin" | "user";
export type UserStatus = "active" | "inactive" | "suspended";

export interface IUser extends Document {
    companyName: string;
    email: string;
    phone?: string;
    passwordHash: string;
    role: UserRole;
    status: UserStatus;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
    {
        companyName: {
            type: String,
            required: [true, "Company name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
        },
        phone: {
            type: String,
            trim: true,
        },
        passwordHash: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ["super_admin", "admin", "user"],
            default: "user",
        },
        status: {
            type: String,
            enum: ["active", "inactive", "suspended"],
            default: "active",
        },
    },
    { timestamps: true }
);

// Method to compare plain password with hash
UserSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

const User = mongoose.model<IUser>("User", UserSchema);
export default User;
