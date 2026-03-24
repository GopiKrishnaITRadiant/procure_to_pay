import {Schema, Types} from "mongoose";

export interface IRole {
    _id: Types.ObjectId;
    name: string;
    permissions: string[];
    isActive:boolean;
    level?:number
}

export const roleSchema = new Schema<IRole>({
    name:{
        type: String,
        required: true,
        trim:true,
    },
    permissions: {
        type: [String],
        required: true,
    },
    isActive:{
        type:Boolean,
        default:true
    },
    level:{
        type:Number,
        trim:true
    }
}, {
    timestamps: true,
    versionKey: false,
})

// export const roleModel = model<IRole>("Role", roleSchema);