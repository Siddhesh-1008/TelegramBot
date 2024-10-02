import mongoose from "mongoose";

const userSchema=mongoose.Schema({
    tgId:{
        type:String,
        required:true,
        unique:true,
    },
    firstName:{
        type:String,
        required:true
    },
    lastName:{
        type:String,
        required:true
    },
    // TO CHECK THE USER THAT IS MESSAGING WHETHER HE/SHE IS A BOT OR NORAML HUMAN
    isBot:{
        type:Boolean,
        required:true
    },
    username:{
        type:String,
        required:true,
        unique:true,
    },
    // REQUIRED ONLY WHEN BOT GENERATE POST FOR U
    promptTokens:{
        type:Number,
        required:false
    },
    completionTokens:{
        type:Number,
        require:false
    },
},
{timestamps:true});

export default mongoose.model('User',userSchema)