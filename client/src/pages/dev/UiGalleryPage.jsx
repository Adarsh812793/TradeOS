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
import Select from "../../components/ui/Select.jsx";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(3);
  const [exchange, setExchange] = useState("all");

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

      <Section id="modal" title="Modal">
        <Button onClick={() => setIsModalOpen(true)}>Open dialog</Button>
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Confirm buy order"
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={() => setIsModalOpen(false)}>Confirm order</Button>
            </>
          }
        >
          <p>You are about to buy 2 shares of RELIANCE.</p>
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

      <Section id="avatar" title="Avatar">
        <Avatar name="Aarav Mehta" size={48} />
        <Avatar name="" size={48} />
        <Avatar name="Sana" size={32} />
      </Section>
    </main>
  );
}
