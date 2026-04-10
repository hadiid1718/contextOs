const Spinner = ({ size = 5 }) => {
  const pixelSize = `${size * 4}px`;

  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-brand border-t-transparent"
      style={{ width: pixelSize, height: pixelSize }}
      aria-label="Loading"
      role="status"
    />
  );
};

export default Spinner;

