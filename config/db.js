import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.DB_URI)
        console.log(`   DB connected!
                    host = ${conn.connection.host}
                    DB_Name = ${conn.connection.name} 
        `);
    } catch (error) {
        console.log(error)
    }
}

export default connectDB