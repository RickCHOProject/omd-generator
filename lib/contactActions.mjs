export const removeUnexpectedContactActions = (container, allowedCount = 2) => {
  const children = Array.from(container?.children || []);
  const unexpected = children.slice(allowedCount);
  unexpected.forEach((element) => element.remove());
  return unexpected.length;
};
