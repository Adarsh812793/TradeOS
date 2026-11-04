import Wallet from "./wallet.model.js";
import AppError from "../../utils/AppError.js";
import ERROR_CODES from "../../utils/errorCodes.js";


//i. Function to get wallet deatils of user based on user_id
const getWallet = async (userId) => {

    const wallet = await Wallet.findOne({
        userId
    });

    if (!wallet) {
        throw new AppError("Wallet not found",404,ERROR_CODES.WALLET_NOT_FOUND);
    }

    return wallet;
};

export default {
    getWallet
};