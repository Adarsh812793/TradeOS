import { useState } from "react";
import Modal from "../../../../components/ui/Modal.jsx";
import Button from "../../../../components/ui/Button.jsx";

import { formatCurrency } from "../../../../utils/currency.utils.js";
import "./PlaceOrderCard.css";

export default function PlaceOrderCard({
    stock,
    selectedOrderType = "buy",
    onOrderTypeChange,
    onSubmit,
    isSubmitting = false,
}) {
    // ==========================================
    // 1. Form state
    // ==========================================
    const [quantity, setQuantity] = useState("1");
    const [error, setError] = useState("");
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

    // ==========================================
    // 2. Derived values
    // ==========================================
    const numericQuantity = Number(quantity);
    const currentPrice = Number(stock?.currentPrice || 0);

    const estimatedTotal =
        numericQuantity > 0 && Number.isInteger(numericQuantity)
            ? numericQuantity * currentPrice
            : 0;

    const isBuy = selectedOrderType === "buy";

    const formattedTotal = formatCurrency(estimatedTotal, stock?.currency || "INR");

    // ==========================================
    // 3. Form submission
    // ==========================================
    const handleSubmit = (event) => {
        event.preventDefault();
        setError("");

        if (!Number.isInteger(numericQuantity) || numericQuantity <= 0) {
            setError("Quantity must be a positive whole number.");
            return;
        }

        // Open confirmation modal before placing the order
        setIsConfirmationOpen(true);
    };

    // ==========================================
    // 4. Confirm order
    // ==========================================
    const handleConfirmOrder = async () => {
        setError("");

        try {
            await onSubmit({
                stockId: stock._id,
                quantity: numericQuantity,
                ordertype: selectedOrderType,
            });

            // Close modal after successful order
            setIsConfirmationOpen(false);

            // Reset quantity after successful order
            setQuantity("1");
        } catch (err) {
            setError(err.message || "Unable to place order.");
        }
    };

    // ==========================================
    // 5. Render
    // ==========================================
    return (
        <section className="place-order-card">

            <div className="place-order-card__header">
                <h2>Place Order</h2>
                <span>{stock.symbol}</span>
            </div>

            <div className="place-order-card__tabs">
                <button
                    type="button"
                    className={isBuy ? "active buy" : ""}
                    onClick={() => onOrderTypeChange("buy")}
                >
                    Buy
                </button>

                <button
                    type="button"
                    className={!isBuy ? "active sell" : ""}
                    onClick={() => onOrderTypeChange("sell")}
                >
                    Sell
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <label htmlFor="order-quantity">Quantity</label>

                <input
                    id="order-quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(event) => {
                        setQuantity(event.target.value);
                        setError("");
                    }}
                    placeholder="Enter quantity"
                />

                <div className="place-order-card__estimate">
                    <span>
                        Estimated {isBuy ? "Cost" : "Proceeds"}
                    </span>

                    <strong>{formattedTotal}</strong>
                </div>

                {error && (
                    <p className="place-order-card__error">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    className={`place-order-card__submit ${
                        isBuy ? "buy" : "sell"
                    }`}
                    disabled={isSubmitting}
                >
                    {isSubmitting
                        ? "Processing..."
                        : `Place ${isBuy ? "Buy" : "Sell"} Order`}
                </button>
            </form>

            <p className="place-order-card__note">
                Orders are executed using the current stored stock price.
                The final amount is confirmed by the server.
            </p>



            {/* ========================================== */}
            {/* 5. Order confirmation modal */}
            {/* ========================================== */}
            <Modal
                isOpen={isConfirmationOpen}
                onClose={() => setIsConfirmationOpen(false)}
                title={`Confirm ${isBuy ? "Buy" : "Sell"} Order`}
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setIsConfirmationOpen(false)}
                        >
                            Cancel
                        </Button>

                        <Button
                            onClick={handleConfirmOrder}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Processing..." : "Confirm Order"}
                        </Button>
                    </>
                }
            >
                <div className="order-confirmation">
                    <p>
                        You are about to {isBuy ? "buy" : "sell"}{" "}
                        <strong>{numericQuantity}</strong> shares of{" "}
                        <strong>{stock.symbol}</strong>.
                    </p>

                    <div className="order-confirmation__total">
                        <span>Estimated {isBuy ? "Cost" : "Proceeds"}</span>
                        <strong>{formattedTotal}</strong>
                    </div>

                    <p className="order-confirmation__note">
                        The final execution price and total will be determined by the server.
                    </p>
                </div>
            </Modal>

        </section>
    );
}