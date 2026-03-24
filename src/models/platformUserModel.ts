import {Types, model, Schema} from "mongoose";

export interface IPlatformUser {
    _id: Types.ObjectId;
    name: string;
    email: string;
    password?: string;
    role: "SUPER_ADMIN" | "SUPPORT_ADMIN";
    permissions:string[];
    authProvider?: "AZURE" | "LOCAL";
    azureAdId?: string;
    status: boolean;
    isVerified:boolean;
    createdAt:Date,
    updatedAt:Date
}

const platformUserSchema = new Schema<IPlatformUser>({
    name: {
        type: String,
        required: true,
    },
    azureAdId: {
        type: String,
        required: false,
        trim:true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        select:false
    },
    role: {
        type: String,
        enum: ["SUPER_ADMIN", "SUPPORT_ADMIN"],
        required: true,
    },
    permissions:{
        type:[String],
        required:false,
    },
    authProvider:{
        type:String,
        enum:["AZURE", "LOCAL"],
        default:"LOCAL"
    },
    status: {
        type: Boolean,
        default: true,
    },
    isVerified:{
        type:Boolean,
        default:false
    }
}, {
    timestamps: true,
    versionKey: false,
});

export const platformUserModel = model<IPlatformUser>("PlatformUser", platformUserSchema);