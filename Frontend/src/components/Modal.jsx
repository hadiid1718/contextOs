const Modal = ({ open, title, children, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-bg2 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text">{title}</h3>
          <button onClick={onClose} className="text-sm text-text3 hover:text-text2">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;

