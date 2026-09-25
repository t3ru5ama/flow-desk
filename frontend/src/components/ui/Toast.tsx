import { useUiStore } from "../../store/uiStore";

const variantClasses = {
  success: "bg-fd-cacao text-white",
  error: "bg-fd-error text-white",
  info: "bg-fd-leather text-white",
};

export function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);
  const removeToast = useUiStore((s) => s.removeToast);
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 rounded-md px-4 py-3 text-sm shadow-lg ${variantClasses[t.variant]}`}
        >
          {t.message}
          <button onClick={() => removeToast(t.id)} className="opacity-70 hover:opacity-100" aria-label="Dismiss">
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
