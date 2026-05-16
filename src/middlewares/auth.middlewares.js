import { JsonWebTokenError } from "jsonwebtoken";
import ApiError from "../utils/Apierror";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from JsonWebTokenError
import { User } from "../models/user.models";


const verifyJWT = asyncHandler(async(req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
        if(!token) throw new ApiError(402, "Unauthorized Access");
        
        
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    
        if(!user)
            throw new ApiError(401, "Invalid Access Token");
    
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Tokenn");
    }



})
export default verifyJWT;