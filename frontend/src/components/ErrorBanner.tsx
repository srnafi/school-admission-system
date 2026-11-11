export default function ErrorBanner({
  message,
  onClose,
}: {
  message?: string | null;
  onClose?: () => void;
}) {
  if (!message) return null;
  return (
    <div className="banner error" role="alert">
      <span>{message}</span>
      {onClose && (
        <button type="button" className="link" onClick={onClose} aria-label="বন্ধ করুন">
          ✕
        </button>
      )}
    </div>
  );
}
