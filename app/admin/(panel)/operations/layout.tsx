export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-6 border border-line bg-mint/50 px-4 py-3 text-sm">
        Intake forms, submitted charts, and patient logins are saved for the practice. Other demo charts stay in this browser until you create a portal login. Nothing here is published on the public site.
      </p>
      {children}
    </div>
  );
}
