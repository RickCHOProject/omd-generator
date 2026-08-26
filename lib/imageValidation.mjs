export const isJpegBytes = (value) => {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value || 0);
  return bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
};
