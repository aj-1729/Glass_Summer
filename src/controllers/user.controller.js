import uploadOnCloudinary from "../cloudinary.js";
import { User } from "../models/user.models.js";
import ApiError from "../utils/Apierror.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import Apiresponse from "../utils/Apiresponse.js"
import fs from "fs"


const registerUser = asyncHandler(
    async (req,res) => {
        
        const {email, fullName, password, username} = req.body;

        // console.log(email);
        // console.log(fullName);

        if(fullName === "")
            throw new ApiError(400, "Full name is required");
        if(password === "")
            throw new ApiError(402, "Password is required");
        if(email === "")
            throw new ApiError(404, "Email is required");
        if(username === "")
            throw new ApiError(406, "username is required!!");

        const exist = await User.findOne(
            {
                $or: [{email},{username}]
            }
        )

        const avatarLocalPath = await req.files?.avatar?.[0]?.path;
        const coverImageLocalPath = await req.files?.coverImage?.[0]?.path;

        if (exist) {
            if (avatarLocalPath && fs.existsSync(avatarLocalPath)) {
                fs.unlinkSync(avatarLocalPath);
            }

            if (coverImageLocalPath && fs.existsSync(coverImageLocalPath)) {
                fs.unlinkSync(coverImageLocalPath);
            }

            throw new ApiError(409, "User Already Exists");
        }


        

        if(!avatarLocalPath)
        {
            throw new ApiError(400, "Avatar file is requiered!");
        }

        const avatar = await uploadOnCloudinary(avatarLocalPath);
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);

        if(!avatar)
            throw new ApiError(400, "Avatar file is requiered!!");

        const user = await User.create({
            fullName,
            password,
            email,
            username: username.toLowerCase(),
            avatar: avatar.url,
            coverImage: coverImage?.url || ""
        })

        const _id = user._id;


        const createdUser = await User.findById(_id).select(
            "-password -refreshToken"
        )

        if(!createdUser)
            throw new ApiError(505, "Something went wrong while registering the user");

        return res.status(202).json(
            new Apiresponse(202, createdUser, "User created successfully")
        )
    }
)

export {registerUser}