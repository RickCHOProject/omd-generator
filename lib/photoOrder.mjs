export const reorderItems = (items, fromIndex, toIndex) => {
  const copy = Array.isArray(items) ? [...items] : [];
  if (
    !Number.isInteger(fromIndex)
    || !Number.isInteger(toIndex)
    || fromIndex < 0
    || toIndex < 0
    || fromIndex >= copy.length
    || toIndex >= copy.length
    || fromIndex === toIndex
  ) return copy;

  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
};
