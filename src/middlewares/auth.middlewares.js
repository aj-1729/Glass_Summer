//import { JsonWebTokenError } from "jsonwebtoken";
import ApiError from "../utils/Apierror.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.models.js";


const verifyJWT = asyncHandler(async(req, res, next) => {
   
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
        if(!token) throw new ApiError(402, "Unauthorized Access");

        console.log(req.cookies);
        console.log(token);
        
        
        const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    
        if(!user)
            throw new ApiError(401, "Invalid Access Token");
    
        req.user = user;
        next();
    } catch (error) {
        console.log(error.message);
        throw new ApiError(401,  "Invalid Tokenn");
    }



})
export default verifyJWT;