import uploadOnCloudinary from "../cloudinary.js";
import { User } from "../models/user.models.js";
import ApiError from "../utils/Apierror.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import Apiresponse from "../utils/Apiresponse.js"



const registerUser = asyncHandler(
    async (req,res) => {
        
        const {email, fullName, password, username} = req.body;

        console.log(email);
        console.log(fullName);

        if(fullName === "")
            throw new ApiError(400, "Full name is required");
        if(password === "")
            throw new ApiError(402, "Password is required");
        if(email === "")
            throw new ApiError(404, "Email is required");
        if(username)
            throw new ApiError(406, "username is required");

        const exist = User.findOne(
            {
                $or: [{email},{username}]
            }
        )

        if(exist) 
            throw new ApiError(408, "User Already Exists");


        const avatarLocalPath = req.files?.avatar[0]?.path;
        const coverImageLocalPath = req.files?.coverImage[0]?.path;

        if(!avatarLocalPath)
        {
            throw new ApiError(400, "Avatar file is requiered");
        }

        const avatar = await uploadOnCloudinary(avatarLocalPath);
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);

        if(!avatar)
            throw new ApiError(400, "Avatar file is requiered");

        User.create({
            fullName,
            password,
            email,
            username: username.toLowercase(),
            avatar: avatar.url,
            coverImage: coverImage?.url || ""
        })


        const createdUser = User.findById(_id).select(
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