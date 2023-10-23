import User from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import { errorHandler } from "../utils/error.js";
import jwt from "jsonwebtoken";

export const signup = async (req, res, next) => {
    const {username, email, password} = req.body;
    // hashing the password with bcryptjs
    const hashedPassword = bcryptjs.hashSync(password, 10);
    // creating a new user instance
    const newUser = new User({ username, email, password: hashedPassword });
    try {
        // saving new user to mongo db
        await newUser.save();
        res.status(201).json("User created successfully");
    } catch (error) {
        next(error);
    }
}

export const signin = async (req, res, next) => {
    const {email, password} = req.body;
    try {
        // check if user exists
        const validUser = await User.findOne({ email });
        if (!validUser) return next(errorHandler(404, "User not found"));
        
        // check whether password is correct 
        const validPassword = bcryptjs.compareSync(password, validUser.password);
        if (!validPassword) return next(errorHandler(401, "Wrong credentials!"));

        // creating token if credentials are correct
        const token = jwt.sign({ id: validUser._id}, process.env.JWT_SECRET_KEY);
        // object destructuring to remove password from data sent to client
        const { password: pass, ...data } = validUser._doc;
        res
            .cookie("access_token", token, { httpOnly: true})
            .status(200)
            .json({data});
    } catch (error) {
        next(error);
    }
}

export const google = async (req, res, next) => {
    const { name, email, photo } = req.body;
    try {
        const user = await User.findOne({ email });
        // if user exists create a token and login
        if (user) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY);
            const { password: pass, ...data } = user._doc;
            res
                .cookie("access_token", token, {httpOnly: true})
                .status(200)
                .json(data);
        }
        // if not then create a new user
        else {
            // creating random username for new user
            const randomUsername = name.split(" ").join("").toLowerCase() + Math.random().toString(36).slice(-3);
            // generating a new password as Google Firebase Auth won't share passwords with us
            const generatedPassword = Math.random().toString(36).slice(-8);
            const hashedPassword = bcryptjs.hashSync(generatedPassword, 10);
            // creating a new user instance with available details
            const newUser = new User({ 
                username: randomUsername, 
                email: email, 
                password: hashedPassword,
                avatar: photo,
            });
            try {
                // saving new user to mongo db
                await newUser.save();
                // creating token after successful user account creation
                const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET_KEY);
                // object destructuring to remove password from data sent to client
                const { password: pass, ...data } = newUser._doc;
                res
                    .cookie("access_token", token, {httpOnly: true})
                    .status(200)
                    .json(data);
            } catch (error) {
                next(error);
            }
        }
        
    } catch (error) {
        next(error);
    }
}