import mongoose from "mongoose";

const employeeSchema = mongoose.Schema({
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
    password:{
        type:String,
        required:true,
    },
    role:{
        type:String,
        enum:["employee"],
        default:"employee"
    },
    address:{
        type:String,
    },
    designation:{
        type:String,
    },
    isBlocked:{
        type:Boolean,
        default:true
    }
},{ timestamps:true });

const Employee = new mongoose.model("Employee", employeeSchema);
export default Employee;

