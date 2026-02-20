import Admin from '../models/Admin.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';



export const registerAdmin = async (req, res) => {
    try {
        const { name, email, mobile, password } = req.body;
        if (!name || !email || !mobile || !password) {
            return res.status(400).json({
                success: false,
                message: "Something is missing!"
            })
        }
        // check if user is alrady exist or not
        const existingUser = await Admin.findOne({
            $or: [{ email }, { mobile }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User is alrady exist with this email or mobile!"
            })
        }

        const saltRounds = Number(process.env.HASH_SALT) || 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = new Admin({
            name,
            email,
            mobile,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({
            message: "Admin registered successfully!",
            success: true,
            user: newUser
        });


    } catch (error) {
        console.log("Error at registration: ", error);
        return res.status(500).json({
            success: false,
            message: "Registration failed!",
            error: error.message
        });
    }
}

export const loginAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(username, password)

        const existingUser = await Admin.findOne({ $or: [{ email: username }, { mobile: username }] })
        if (!existingUser) {
            return res.status(400).json({ 
                success: false,
                message: "User is not exist with this username." 
            })
        }

        const passwordMatched = await bcrypt.compare(password, existingUser.password);
        if (!passwordMatched) {
            return res.status(400).json({ 
                success: false,
                message: "Invalid password" 
            })
        }

        const token = jwt.sign({
            id: existingUser._id,
            name: existingUser.name,
            email: existingUser.email,
            mobile: existingUser.mobile,
            role: existingUser.role,
        }, process.env.JWT_SECRET,
            { expiresIn: `${process.env.JWT_EXPIRES_IN}y` });

        // Token console mein print karo
        console.log("\n" + "=".repeat(80));
        console.log("🔐 ADMIN LOGIN SUCCESSFUL");
        console.log("=".repeat(80));
        console.log("👤 User:", existingUser.name);
        console.log("📧 Email:", existingUser.email);
        console.log("📱 Mobile:", existingUser.mobile);
        console.log("🎭 Role:", existingUser.role);
        console.log("-".repeat(80));
        console.log("🎫 JWT TOKEN:");
        console.log(token);
        console.log("=".repeat(80) + "\n");

        res.cookie("token", token, {
            httpOnly: process.env.HTTP_ONLY === 'true',     // Convert string to boolean
            secure: process.env.SECURE === 'true',          // Convert string to boolean
            sameSite: process.env.SAME_SITE || 'Strict',    // Use default if undefined
            maxAge: Number(process.env.MAX_AGE) || 7 * 24 * 60 * 60 * 1000  // Convert to number
        });

        res.status(200).json({
            message: "Admin has been Login!",
            success: true,
            user: {
                id: existingUser._id,
                name: existingUser.name,
                email: existingUser.email,
                mobile: existingUser.mobile,
                role: existingUser.role,
            },
            token
        })

    } catch (error) {
        console.log("Error at Login: ", error);
        return res.status(500).json({
            success: false,
            message: "Login failed!",
            error: error.message
        });
    }
}


// Live Monitor API - Admin can see which TV is playing what ad
export const getLiveMonitor = async (req, res) => {
    try {
        const { TV } = await import('../models/TV.js');
        const { AdSchedule } = await import('../models/AdSchedule.js');

        // Get current time (India timezone)
        const now = new Date();
        const currentTime = now.toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });

        // Get all online TVs
        const tvs = await TV.find({ status: "online", isActive: true })
            .populate('store', 'name')
            .populate('zone', 'name')
            .populate('city', 'name')
            .select('tvId tvName status store zone city');

        // Check each TV's schedule
        const liveData = await Promise.all(tvs.map(async (tv) => {
            // Get today's schedules for this TV
            const schedules = await AdSchedule.find({
                "tvs.tv": tv._id,
                isActive: true,
                validFrom: { $lte: now },
                validTo: { $gte: now }
            }).populate('ad', 'title videoUrl duration adId');

            let currentlyPlaying = null;

            // Check if any ad is playing NOW
            for (const schedule of schedules) {
                const tvEntry = schedule.tvs.find(t => t.tv.toString() === tv._id.toString());
                
                if (tvEntry && tvEntry.playTimes.includes(currentTime)) {
                    currentlyPlaying = {
                        ad: schedule.ad,
                        scheduledTime: currentTime,
                        playTimes: tvEntry.playTimes
                    };
                    break;
                }
            }

            return {
                ...tv.toObject(),
                currentlyPlaying,
                isPlaying: !!currentlyPlaying
            };
        }));

        res.status(200).json({
            success: true,
            currentTime,
            data: liveData,
            summary: {
                total: liveData.length,
                playing: liveData.filter(tv => tv.isPlaying).length,
                idle: liveData.filter(tv => !tv.isPlaying).length
            }
        });

    } catch (error) {
        console.error("Error in live monitor:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};
