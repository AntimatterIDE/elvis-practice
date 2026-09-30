export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-6 border border-line bg-mint/50 px-4 py-3 text-sm">
        Demo records stay in this browser. They are not sent to a payer, and they are not the public site content.
      </p>
      {children}
    </div>
  );
}
