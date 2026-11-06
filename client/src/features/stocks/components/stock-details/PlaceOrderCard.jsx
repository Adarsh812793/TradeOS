import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../../../components/ui/Modal.jsx";
import Button from "../../../../components/ui/Button.jsx";
import ResultState from "../../../../components/ui/ResultState.jsx";

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
    const [orderResult, setOrderResult] = useState(null); // set when the order went through (drives the success view)
    const [orderError, setOrderError] = useState(""); // shown inside the dialog when the order fails
    const navigate = useNavigate();

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
        setOrderError("");

        try {
            const response = await onSubmit({
                stockId: stock._id,
                quantity: numericQuantity,
                ordertype: selectedOrderType,
            });

            // Keep the dialog open and switch it to the success view, with the figures the server confirmed
            setOrderResult({
                wasBuy: isBuy,
                quantity: numericQuantity,
                symbol: stock.symbol,
                total: response?.data?.order?.totalValue ?? estimatedTotal,
                walletBalance: response?.data?.walletBalance,
            });

            // Reset quantity after successful order
            setQuantity("1");
        } catch (err) {
            // The dialog is still open, so the error must show inside it (the form behind the overlay is not visible)
            setOrderError(err.message || "Unable to place order.");
        }
    };

    // Closes the dialog and clears its success / error state
    const closeConfirmation = () => {
        setIsConfirmationOpen(false);
        setOrderResult(null);
        setOrderError("");
    };

    // After a successful order: close the dialog and open the orders list
    const viewOrders = () => {
        closeConfirmation();
        navigate("/orders");
    };

    const currency = stock?.currency || "INR";

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
                onClose={closeConfirmation}
                size="sm"
                closeOnOverlayClick={!isSubmitting}
                closeOnEscape={!isSubmitting}
                title={
                    orderResult
                        ? "Order placed"
                        : `Confirm ${isBuy ? "Buy" : "Sell"} Order`
                }
                footer={
                    orderResult ? (
                        <>
                            <Button variant="secondary" onClick={viewOrders}>
                                View orders
                            </Button>

                            <Button onClick={closeConfirmation}>Done</Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="secondary"
                                onClick={closeConfirmation}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>

                            <Button
                                variant={isBuy ? "success" : "danger"}
                                onClick={handleConfirmOrder}
                                loading={isSubmitting}
                            >
                                {isSubmitting ? "Placing order" : "Confirm Order"}
                            </Button>
                        </>
                    )
                }
            >
                {orderResult ? (
                    <ResultState
                        kind="success"
                        title={`${orderResult.wasBuy ? "Bought" : "Sold"} ${orderResult.quantity} \u00d7 ${orderResult.symbol}`}
                        description="Your order was executed."
                    >
                        <dl className="order-confirmation__rows">
                            <div>
                                <dt>{orderResult.wasBuy ? "Total cost" : "Total proceeds"}</dt>
                                <dd>{formatCurrency(orderResult.total, currency)}</dd>
                            </div>

                            {orderResult.walletBalance !== undefined && (
                                <div>
                                    <dt>Wallet balance</dt>
                                    <dd>{formatCurrency(orderResult.walletBalance, currency)}</dd>
                                </div>
                            )}
                        </dl>
                    </ResultState>
                ) : (
                    <div className="order-confirmation">
                        <p>
                            You are about to {isBuy ? "buy" : "sell"}{" "}
                            <strong>{numericQuantity}</strong> shares of{" "}
                            <strong>{stock.symbol}</strong>.
                        </p>

                        <dl className="order-confirmation__rows">
                            <div>
                                <dt>Estimated {isBuy ? "Cost" : "Proceeds"}</dt>
                                <dd>{formattedTotal}</dd>
                            </div>
                        </dl>

                        <p className="order-confirmation__note">
                            The final execution price and total will be determined by the server.
                        </p>

                        {orderError && (
                            <p className="order-confirmation__error" role="alert">
                                {orderError}
                            </p>
                        )}
                    </div>
                )}
            </Modal>

        </section>
    );
}