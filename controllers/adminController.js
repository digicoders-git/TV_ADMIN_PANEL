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