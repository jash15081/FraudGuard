const fs = require("fs");
const path = require("path");
const outPath = path.join(__dirname, "transaction_sample.csv");
const fieldnames = [
  "userId",
  "transactionId",
  "transactionTime",
  "ccNum",
  "transactionType",
  "amount",
  "city",
  "userLat",
  "userLon",
  "merchantLat",
  "merchantLon",
  "isFraud",
  "fraudReason",
  "fraudConfidence",
];
const transactionTypes = [
  "purchase",
  "transfer",
  "cash_out",
  "payment",
  "withdrawal",
];
const cities = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Phoenix",
  "Philadelphia",
  "San Antonio",
  "San Diego",
  "Dallas",
  "San Jose",
];
const randObjId = () =>
  Array.from(
    { length: 24 },
    () => "0123456789abcdef"[Math.floor(Math.random() * 16)],
  ).join("");
const randCc = () =>
  Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join("");
const randDate = () => {
  const start = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const end = new Date();
  const d = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
  return d.toISOString();
};

const w = fs.createWriteStream(outPath, { encoding: "utf8" });
w.write(fieldnames.join(",") + "\n");
for (let i = 0; i < 100; i++) {
  const isFraud = Math.random() < 0.25;
  const fraudReasons = isFraud
    ? [
        "high_amount",
        "suspicious_location",
        "velocity",
        "blacklisted_merchant",
      ][Math.floor(Math.random() * 4)]
    : "";
  const fraudConfidence = isFraud
    ? (Math.random() * 0.24 + 0.75).toFixed(4)
    : "";
  const row = {
    userId: randObjId(),
    transactionId: "tx-" + (i + 1).toString().padStart(4, "0"),
    transactionTime: randDate(),
    ccNum: randCc(),
    transactionType:
      transactionTypes[Math.floor(Math.random() * transactionTypes.length)],
    amount: (Math.random() * 4999 + 1).toFixed(2),
    city: cities[Math.floor(Math.random() * cities.length)],
    userLat: (Math.random() * 180 - 90).toFixed(6),
    userLon: (Math.random() * 360 - 180).toFixed(6),
    merchantLat: (Math.random() * 180 - 90).toFixed(6),
    merchantLon: (Math.random() * 360 - 180).toFixed(6),
    isFraud: isFraud,
    fraudReason: fraudReasons,
    fraudConfidence: fraudConfidence,
  };

  const line = fieldnames
    .map((fn) => {
      const val = row[fn] ?? "";
      const s = String(val);
      if (s.includes(",")) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    })
    .join(",");

  w.write(line + "\n");
}

w.end(() => console.log("Updated CSV with mixed fraud content:", outPath));
