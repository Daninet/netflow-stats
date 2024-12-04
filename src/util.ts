export const roundToDecimal = (num: number, decimals: number) => {
  return Number(num.toFixed(decimals));
};

export const formatDate = (date: string | Date, shorthand = true) => {
  if (typeof date === "string") date = new Date(date);

  if (shorthand) {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 1) return "just now";
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 60 * 60) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 60 * 60 * 24) return `${Math.floor(diff / 60 / 60)} hours ago`;
  }

  const year = date.getFullYear();
  const month = `0${date.getMonth() + 1}`.slice(-2);
  const day = `0${date.getDate()}`.slice(-2);
  const hour = `0${date.getHours()}`.slice(-2);
  const minute = `0${date.getMinutes()}`.slice(-2);
  const second = `0${date.getSeconds()}`.slice(-2);
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

export const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${roundToDecimal(seconds, 0)} seconds`;
  if (seconds < 60 * 60) return `${roundToDecimal(seconds / 60, 0)} minutes`;
  if (seconds < 60 * 60 * 24)
    return `${roundToDecimal(seconds / 60 / 60, 2)} hours`;
  return `${roundToDecimal(seconds / 60 / 60 / 24, 2)} days`;
};

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${roundToDecimal(bytes / 1024, 2)} KB`;
  const exp = Math.floor(Math.log(bytes) / Math.log(1024));
  // biome-ignore lint/style/useExponentiationOperator: <explanation>
  const pre = roundToDecimal(bytes / Math.pow(1024, exp), 2);
  return `${pre} ${["B", "KB", "MB", "GB", "TB"][exp]}`;
};
