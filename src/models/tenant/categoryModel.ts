import { Types,Schema,model } from "mongoose";

export interface ICategory {
  _id: Types.ObjectId;
  name: string;
  description:string;
  isActive: boolean;
  createdBy: Types.ObjectId,
  updatedBy:Types.ObjectId
}

export const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    description:{
      type:String,
      trim:true
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy:{
        type:Types.ObjectId,
        required:true
    },
    updatedBy:{
        type:Types.ObjectId
    }

  },
  { timestamps: true,versionKey:false }
);
