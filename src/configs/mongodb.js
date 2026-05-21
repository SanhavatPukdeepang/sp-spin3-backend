import mongoose from "mongoose";
export async function connectDB() {
    

const uri =process.env.MONGODB_URI;
try{
    await mongoose.connect(uri,{dbName:"serious-spin3"});
    console.log("MongoDB connected")

}catch(err){
    console.error("MongoDB connection error:", err.message);
    
}



}