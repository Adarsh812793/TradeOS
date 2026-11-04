import walletService from "./wallet.service.js";
import asyncWrap from "../../utils/asyncWrap.js";

//i. Get current user's wallet
const getWallet =asyncWrap( async (req, res, next) => {

        // Identity comes from verified JWT
        const userId = req.user.userId;

        const wallet = await walletService.getWallet(
            userId
        );

        res.status(200).json({
            success: true,
            data: wallet
        });
});


export default {
    getWallet
};