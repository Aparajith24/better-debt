export function formatCurrency(value: string | number) {
  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatMonthsFromNow(months: number) {
  const date = new Date();
  date.setDate(1); // avoid month rollover skew from short months (e.g. Jan 31 + 1mo)
  date.setMonth(date.getMonth() + months);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
