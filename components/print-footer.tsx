/**
 * Print-only footer. Hidden on screen via CSS, shows on every printed page.
 * Uses the .print-footer class defined in globals.css @media print block.
 * No Tailwind display classes — CSS-only to avoid specificity conflicts.
 */
export function PrintFooter({ date }: { date?: string }) {
  const d =
    date ??
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="print-footer">
      <span>Ed Henderson &nbsp;·&nbsp; Blake-Dickson Real Estate</span>
      <span>{d}</span>
    </div>
  );
}
