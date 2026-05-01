export function Banner({ type = "info", children }) {
  if (!children) {
    return null;
  }

  return <div className={`banner ${type}`}>{children}</div>;
}
