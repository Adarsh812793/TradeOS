// Date and time for tables and cards, e.g. 01 Nov 2026, 10:42 am
export function formatDateTime(date) {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Short "time ago" text for lists, e.g. "Just now", "5 min ago", "3 hr ago", "Yesterday", "12 Oct 2026"
export function formatRelativeTime(date) {
  if (!date) return "";

  const seconds = Math.round((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 45) return "Just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
