// Development-only page (/dev/ui) that shows every shared component in every state on one screen.
// It is not part of the production build. Open it while building or restyling a component.
import { useState } from "react";

import Avatar from "../../components/ui/Avatar.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Input from "../../components/ui/Input.jsx";
import LoadingSpinner from "../../components/ui/LoadingSpinner.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import PriceChange from "../../components/ui/PriceChange.jsx";
import ResultState from "../../components/ui/ResultState.jsx";
import SegmentedControl from "../../components/ui/SegmentedControl.jsx";
import Select from "../../components/ui/Select.jsx";
import Skeleton, { SkeletonList, SkeletonRegion, SkeletonStats, SkeletonTable } from "../../components/ui/Skeleton.jsx";
import Table from "../../components/ui/Table.jsx";

import "./UiGalleryPage.css";

// One titled block of the gallery.
function Section({ id, title, note, children }) {
  return (
    <section className="ui-gallery__section" id={id}>
      <h2>{title}</h2>
      {note && <p className="ui-gallery__note">{note}</p>}
      <div className="ui-gallery__row">{children}</div>
    </section>
  );
}

export default function UiGalleryPage() {
  const [dialog, setDialog] = useState(null); // null | "confirm" | "success" | "error"
  const [page, setPage] = useState(3);
  const [exchange, setExchange] = useState("all");
  const [side, setSide] = useState("buy");
  const [range, setRange] = useState("1D");

  const pagination = {
    page,
    limit: 10,
    totalItems: 338,
    totalPages: 34,
    hasNextPage: page < 34,
    hasPreviousPage: page > 1,
  };

  return (
    <main className="ui-gallery">
      <header className="ui-gallery__header">
        <h1>TradeOS components</h1>
        <p>Every shared component in every state. Development only.</p>
      </header>

      <Section id="buttons" title="Button" note="Variants by meaning (success = buy, danger = sell or delete), sizes, loading, full width.">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="success">Buy</Button>
        <Button variant="danger">Sell</Button>
        <Button disabled>Disabled</Button>
        <Button variant="secondary" disabled>Disabled</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
        <Button loading>Placing order</Button>
        <Button variant="success" loading>Buying</Button>
        <div className="ui-gallery__field">
          <Button block>Full width</Button>
        </div>
      </Section>

      <Section id="inputs" title="Input" note="Normal, with error, disabled, password.">
        <div className="ui-gallery__field">
          <Input label="Email" name="gallery-email" placeholder="you@example.com" required />
        </div>
        <div className="ui-gallery__field">
          <Input label="Full name" name="gallery-name" value="Aarav Mehta" onChange={() => {}} error="Name must be at least 2 characters" />
        </div>
        <div className="ui-gallery__field">
          <Input label="Disabled" name="gallery-disabled" value="Not editable" onChange={() => {}} disabled />
        </div>
        <div className="ui-gallery__field">
          <Input label="Password" name="gallery-password" type="password" placeholder="Enter your password" />
        </div>
        <div className="ui-gallery__field">
          <Input label="Quantity" name="gallery-hint" placeholder="Enter quantity" hint="Whole numbers only" />
        </div>
      </Section>

      <Section id="selects" title="Select" note="Stacked label and inline label.">
        <div className="ui-gallery__field">
          <Select
            label="Exchange"
            id="gallery-exchange"
            value={exchange}
            onChange={setExchange}
            options={[
              { value: "all", label: "All Exchanges" },
              { value: "NSE", label: "NSE" },
              { value: "BSE", label: "BSE" },
            ]}
          />
        </div>
        <div className="ui-gallery__field">
          <Select
            inline
            label="Sort by"
            id="gallery-sort"
            value={exchange}
            onChange={setExchange}
            options={[
              { value: "all", label: "Current value" },
              { value: "NSE", label: "P&L" },
            ]}
          />
        </div>
      </Section>

      <Section id="segmented" title="SegmentedControl" note="Arrow keys change the selection. Tone success / danger for Buy / Sell.">
        <div className="ui-gallery__field">
          <SegmentedControl
            label="Order type"
            fill
            value={side}
            onChange={setSide}
            options={[
              { value: "buy", label: "Buy", tone: "success" },
              { value: "sell", label: "Sell", tone: "danger" },
            ]}
          />
        </div>
        <SegmentedControl
          label="Time range"
          size="sm"
          value={range}
          onChange={setRange}
          options={["1D", "1W", "1M", "3M", "1Y", "ALL"].map((value) => ({ value, label: value }))}
        />
      </Section>

      <Section id="price-change" title="PriceChange" note="Sign and colour: green up, red down, grey at zero. Amount, percent or both, optional arrow.">
        <PriceChange amount={1700} />
        <PriceChange amount={-839.46} />
        <PriceChange amount={0} />
        <PriceChange percent={7.23} />
        <PriceChange percent={-2.1} />
        <PriceChange amount={1700} percent={7.23} arrow />
        <PriceChange amount={-250} percent={-2.1} arrow />
      </Section>

      <Section id="table" title="Table" note="The shared frame: header row, dividers, numbers right-aligned in the mono font.">
        <div className="ui-gallery__wide">
          <Table caption="Example holdings" minWidth={520}>
            <thead>
              <tr>
                <th>Stock</th>
                <th className="data-table__num">Quantity</th>
                <th className="data-table__num">Price</th>
                <th className="data-table__num">P&amp;L</th>
                <th className="data-table__actions">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>RELIANCE</td>
                <td className="data-table__num">10</td>
                <td className="data-table__num">₹2,520.00</td>
                <td className="data-table__num"><PriceChange amount={1700} /></td>
                <td className="data-table__actions"><Button size="sm" variant="secondary">Details</Button></td>
              </tr>
              <tr>
                <td>SBIN</td>
                <td className="data-table__num">15</td>
                <td className="data-table__num">₹802.00</td>
                <td className="data-table__num"><PriceChange amount={-336} /></td>
                <td className="data-table__actions"><Button size="sm" variant="secondary">Details</Button></td>
              </tr>
            </tbody>
          </Table>
        </div>
      </Section>

      <Section id="badges" title="Badge">
        <Badge variant="success">Executed</Badge>
        <Badge variant="warning">Pending</Badge>
        <Badge variant="danger">Rejected</Badge>
        <Badge variant="info">Info</Badge>
        <Badge>Neutral</Badge>
      </Section>

      <Section id="cards" title="Card" note="Padding sm, md, lg and with shadow.">
        <Card padding="none">No padding</Card>
        <Card padding="sm">Small padding</Card>
        <Card padding="md">Medium padding</Card>
        <Card padding="lg" shadow>Large padding with shadow</Card>
      </Section>

      <Section id="result" title="ResultState" note="Animated tick for success, cross for failure. Used in the order dialog.">
        <Card padding="lg">
          <ResultState kind="success" title="Bought 2 × RELIANCE" description="Your order was executed." />
        </Card>
        <Card padding="lg">
          <ResultState kind="error" title="Order failed" description="Insufficient wallet balance." />
        </Card>
      </Section>

      <Section id="modal" title="Modal" note="Focus moves in, Tab stays inside, Esc closes, focus returns.">
        <Button onClick={() => setDialog("confirm")}>Open dialog</Button>
        <Button variant="secondary" onClick={() => setDialog("success")}>Success view</Button>
        <Button variant="secondary" onClick={() => setDialog("error")}>Error view</Button>
        <Modal
          isOpen={dialog !== null}
          onClose={() => setDialog(null)}
          size="sm"
          title={dialog === "confirm" ? "Confirm buy order" : dialog === "success" ? "Order placed" : "Order failed"}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialog(null)}>
                {dialog === "confirm" ? "Cancel" : "Close"}
              </Button>
              {dialog === "confirm" && (
                <Button variant="success" onClick={() => setDialog("success")}>Confirm order</Button>
              )}
            </>
          }
        >
          {dialog === "confirm" && <p>You are about to buy 2 shares of RELIANCE.</p>}
          {dialog === "success" && (
            <ResultState kind="success" title="Bought 2 × RELIANCE" description="Your order was executed." />
          )}
          {dialog === "error" && (
            <ResultState kind="error" title="Order failed" description="Insufficient wallet balance." />
          )}
        </Modal>
      </Section>

      <Section id="pagination" title="Pagination" note="34 pages, to check long lists.">
        <div className="ui-gallery__wide">
          <Pagination pagination={pagination} onPageChange={setPage} itemLabel="stocks" />
        </div>
      </Section>

      <Section id="empty" title="EmptyState" note="Icons: orders, portfolio, watchlist, transactions, search.">
        <div className="ui-gallery__wide">
          <EmptyState
            title="No orders yet"
            description="Your orders will appear here after you place your first trade."
            icon="orders"
            actionLabel="Browse stocks"
            onAction={() => {}}
          />
        </div>
        <EmptyState title="Your watchlist is empty" icon="watchlist" />
        <EmptyState title="No holdings yet" icon="portfolio" />
        <EmptyState title="No transactions" icon="transactions" />
      </Section>

      <Section id="spinner" title="LoadingSpinner">
        <LoadingSpinner label="Loading your portfolio..." />
        <LoadingSpinner size={40} label="Large" />
      </Section>

      <Section id="skeleton" title="Skeleton" note="Placeholders shown while a page loads: shapes, stat cards, list rows and a table. Shimmer stops for reduced motion.">
        <Skeleton width={200} height={24} />
        <Skeleton width={120} height={12} />
        <div className="ui-gallery__wide">
          <SkeletonRegion label="Loading example">
            <SkeletonStats count={3} />
            <SkeletonList rows={2} rowHeight={48} />
            <SkeletonTable columns={5} rows={3} />
          </SkeletonRegion>
        </div>
      </Section>

      <Section id="avatar" title="Avatar">
        <Avatar name="Aarav Mehta" size={48} />
        <Avatar name="" size={48} />
        <Avatar name="Sana" size={32} />
      </Section>
    </main>
  );
}
