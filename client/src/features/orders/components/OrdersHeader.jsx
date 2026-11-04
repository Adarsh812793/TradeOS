import "./OrdersHeader.css";

export default function OrdersHeader({ totalItems = 0 }) {
  return (
    <header className="orders-header">
      <div>
        <h1 className="orders-header__title">My Orders</h1>
        <p className="orders-header__subtitle">
          View and track all your buy and sell orders
        </p>
      </div>

      <span className="orders-header__count">
        {totalItems} {totalItems === 1 ? "order" : "orders"}
      </span>
    </header>
  );
}