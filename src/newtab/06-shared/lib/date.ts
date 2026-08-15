export function getCurrentData(): string {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[today.getMonth()];
  const minutes = String(today.getMinutes()).padStart(2, "0");
  const hours = String(today.getHours()).padStart(2, "0");

  return `${day} ${month}, ${hours}:${minutes}`;
}
