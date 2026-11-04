
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import "./AccountSection.css";

// One collapsible row of the Account page: click the header to open or close its content.
// Content is mounted on the first open and then kept (hidden), so unsaved form input survives a collapse.
export default function AccountSection({
  icon: Icon,
  title,
  hint,
  variant = "default",
  defaultOpen = false,
  children,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [hasOpened, setHasOpened] = useState(defaultOpen);

  const id = useId();
  const headerId = `${id}-header`;
  const panelId = `${id}-panel`;

  // Opens a closed section or closes an open one
  function toggle() {
    setIsOpen((open) => !open);
    setHasOpened(true);
  }

  return (
    <section className={`account-section account-section--${variant}`}>
      <h2 className="account-section__heading">
        <button
          type="button"
          id={headerId}
          className="account-section__header"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={toggle}
        >
          <span className="account-section__icon" aria-hidden="true">
            <Icon size={18} />
          </span>

          <span className="account-section__title">{title}</span>

          {hint && <span className="account-section__hint">{hint}</span>}

          <ChevronDown
            size={18}
            className="account-section__chevron"
            aria-hidden="true"
          />
        </button>
      </h2>

      {/* `inert` keeps a closed panel out of the tab order and away from screen readers */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className={`account-section__panel ${
          isOpen ? "account-section__panel--open" : ""
        }`}
        inert={!isOpen}
      >
        <div className="account-section__panel-inner">
          <div className="account-section__body">
            {hasOpened && children}
          </div>
        </div>
      </div>
    </section>
  );
}
