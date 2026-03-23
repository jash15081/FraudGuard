const fs = require("fs");
const path = require("path");

const outPath = path.join(__dirname, "transaction_sample.csv");
const randomUUID = () => {
  // simple uuid fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
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

const out = fs.createWriteStream(outPath, { encoding: "utf8" });
out.write(fieldnames.join(",") + "\n");
for (let i = 0; i < 100; i++) {
  const isFraud = Math.random() < 0.12;
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
    transactionId: randomUUID(),
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
    isFraud,
    fraudReason: fraudReasons,
    fraudConfidence,
  };

  const line = fieldnames
    .map((fn) => {
      const val = String(row[fn] ?? "");
      if (val.includes(",")) {
        return '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    })
    .join(",");

  out.write(line + "\n");
}

out.end(() => console.log("Generated:", outPath));
