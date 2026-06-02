/**
 * Shown only when printing. Renders at the bottom of every exported report.
 * CSS in globals.css fixes it to the bottom of each printed page.
 */
export function PrintFooter({ date }: { date?: string }) {
  return (
    <div className="print-footer hidden print:flex">
      <span>Ed Henderson · Blake-Dickson Real Estate</span>
      <span>{date ?? new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
    </div>
  );
}
