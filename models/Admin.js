import mongoose from "mongoose";
import { type } from "os";

const adminSchema = mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    mobile:{
        type:String,
        required:true,
        unique:true
    },
    role:{
        type:String,
        enum:["admin"],
        default:"admin"
    },
    password:{
        type:String,
        required:true
    },
}, { timestamp:true })

const Admin =  mongoose.model("Admin", adminSchema);
export default Admin;