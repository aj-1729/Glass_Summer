import uploadOnCloudinary from "../cloudinary.js";
import { User } from "../models/user.models.js";
import ApiError from "../utils/Apierror.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import Apiresponse from "../utils/Apiresponse.js"
import fs from "fs"
import jwt from "jsonwebtoken"



const generateRefreshAndAccessToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        // const accessToken = await user.generateAccessToken();
        // const refreshToken = await user.generateRefreshToken();

        //console.log("access:", typeof accessToken, accessToken);
        //console.log("refresh:", typeof refreshToken, refreshToken);

        user.refreshToken = refreshToken;

        await user.save({validateBeforeSave: false});

    
        return {accessToken, refreshToken};

    } catch (error) {
        throw new ApiError(500, "Something went wrong will generating RAT");
    }
}

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

const loginUser = asyncHandler(
    async (req,res) => {
        //do login using email / username 
        //auto catch that it will be login or email
        //check with the user input on both feild of email and username
        //check the password
        

        const {email, username, password} = req.body;

        if(!username && !email)
        {
            throw new ApiError(400, "Username or Password is requiered");
        }

        const user = await User.findOne({
            $or: [{username:username},{email:email}]
        })

        if(!user)
        {
            throw new ApiError(402, "User does not exists!!");
        }

        const isPasswordValid = await user.isPasswordCorrect(password);

        const{accessToken, refreshToken} = await generateRefreshAndAccessToken(user._id);

        const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

        const options = {
            httpOnly: true,
            secure: true
        }

        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json
        (
            new Apiresponse(200, {
                user: loggedInUser, accessToken, refreshToken
            },"User Logged In successfully..")
        )

    }
)

const logoutUser = asyncHandler(
    async (req,res) => 
    {
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $set:{
                    refreshToken: undefined
                }
            },
            {
                new: true
            }
        )

        const options = {
            httpOnly: true,
            secure: true
        }

        return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new Apiresponse(200, {}, "User Logged Out!!")
        )


    }

    
    
)

const refreshAccessToken = asyncHandler(
    async(res,req) => {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

        if(!incomingRefreshToken)
            throw new ApiError(401, "unauthorized request");

        try {
            const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
            const user = await User.findById(decodedToken?._id);
    
            if(!user)
                throw new ApiError(402,"Invalid Refresh Token");
    
            if(incomingRefreshToken !== user?.refreshToken)
                throw new ApiError(401, "Refresh Token is expired or used");
    
            const options = {
                httpOnly: true,
                secure: true
            }
    
            const{accessToken, refreshToken} = await generateRefreshAndAccessToken(user._id);
    
    
            return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new Apiresponse(
                    200,
                    {accessToken,refreshToken},
                    "Access Token is refreshed"
                )
            )
    
        } catch (error) {
            throw new ApiError(402, error?.message || "Inavlid Refresh Token");
        }


    }
)

const changeCurrentPassword = asyncHandler(
    async(req,res) => {
        const {oldPassword, newPassword} = req.body

        const user =  await User.findById(res.user?._id);

        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

        if(!isPasswordCorrect)
            throw new ApiError(400, "Invalid Old password");

        user.password = newPassword;

        await user.save({validateBeforeSave: false});

        return res.
        status(200)
        .json(
            new Apiresponse(200, {}, "Password Changed Successfully")
        )

    }
)

const getUser = asyncHandler(
    async(req,res) => {
        return res
        .status
        .json(
            200,
            req.user,
            "Current User info."
        )
    }
)

const updateAccountDetails = asyncHandler(
    async(req,res) => {
        const {fullName, email} = req.body;

        if(!fullName || !email)
            throw new ApiError(402, "All feilds are requiered");

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    fullName,
                    email
                }
            },
            {new: true}
        ).select("-password");

        return res
        .status(200)
        .json(
            new Apiresponse(200, user, "Account Details updated successfully!")
        )
    }
)

const updateUserAvatar = asyncHandler(
    async(req,res) => 
    {
        const avatarLocalPath = req.file?.path;
        if(!avatarLocalPath)
            throw new ApiError(400, "Avatar file is missing")

        const avatar = await uploadOnCloudinary(avatarLocalPath);

        if(!avatar.url)
            throw new ApiError(400, "Error while uploading avatar");


        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    avatar: avatar.url
                }
            },
            {
                new: true
            }
        ).select("-password")

        return res
        .status(200)
        .json(
            new Apiresponse(200, user, "Avatar Image Uploaded Successfully")
        )

    }
)

const updateUserCoverImage = asyncHandler(
    async(req,res) => 
    {
        const coverImageLocalPath = req.file?.path;
        if(!coverImageLocalPath)
            throw new ApiError(400, "Cover Image file is missing")

        const coverImage = await uploadOnCloudinary(coverImageLocalPath);

        if(!coverImage.url)
            throw new ApiError(400, "Error while uploading coverImage");


        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    coverImage: coverImage.url
                }
            },
            {
                new: true
            }
        ).select("-password");

        return res
        .status(200)
        .json(
            new Apiresponse(200, user, "Cover Image Uploaded Successfully")
        )

    }

    
)
export {registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getUser,
    changeCurrentPassword,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
}
