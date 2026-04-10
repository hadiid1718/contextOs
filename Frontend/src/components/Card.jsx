const Card = ({ title, description, children }) => {
  return (
    <section className="rounded-xl border border-border bg-bg2 p-5">
      {title ? <h3 className="text-base font-semibold text-text">{title}</h3> : null}
      {description ? <p className="mt-1 text-sm text-text2">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
};

export default Card;

