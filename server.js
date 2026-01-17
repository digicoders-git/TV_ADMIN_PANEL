import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from './config/db.js'
import cookieParser from 'cookie-parser'


import path from 'path';
import { fileURLToPath } from 'url';


import adminRoutes from './routes/adminRoutes.js';
import countryRoutes from './routes/countryRoutes.js';
import stateRoutes from "./routes/stateRoutes.js";
import cityRoutes from "./routes/cityRoutes.js";
import zoneRoutes from "./routes/zoneRoutes.js";
import storeRoutes from "./routes/storeRoutes.js";
import tvRoutes from "./routes/tvRoutes.js";
import advertiserRoutes from "./routes/advertiserRoutes.js";
import adRoutes from "./routes/adRoutes.js";
import adScheduleRoutes from "./routes/adScheduleRoutes.js";
import adLogRoutes from "./routes/adLogRoutes.js";
import statisticsRoutes from "./routes/statisticsRoutes.js";




dotenv.config()




const app =  express();
await connectDB()
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.get('/', (req, res)=>{
    res.send("Server is running smothely..........");
})

app.use("/api/admin", adminRoutes);
app.use("/api/countries", countryRoutes);
app.use("/api/states", stateRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/zones", zoneRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/tvs", tvRoutes);
app.use("/api/advertisers", advertiserRoutes);
app.use("/api/ads", adRoutes);
app.use("/api/ads-schedule", adScheduleRoutes);
app.use("/api/adlogs", adLogRoutes);
app.use("/api/stats", statisticsRoutes);







app.listen(process.env.PORT, ()=>{
    console.log("Server is running on PORT ", process.env.PORT);
})

