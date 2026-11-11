function parseTrustProxy(value = "false") {
  const setting = String(value).trim();
  if (!setting || setting === "false") return false;
  if (setting === "true") return true;
  if (/^\d+$/.test(setting)) return Number(setting);
  if (setting.includes(",")) return setting.split(",").map((item) => item.trim()).filter(Boolean);
  return setting;
}

module.exports = { parseTrustProxy };
