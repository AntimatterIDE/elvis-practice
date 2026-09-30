export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-6 border border-line bg-mint/50 px-4 py-3 text-sm">
        Demo charts stay in this browser. The practice runs the day from Today, Patients, and Schedule. Claims stay with the billing team, and nothing here is published on the public site.
      </p>
      {children}
    </div>
  );
}
