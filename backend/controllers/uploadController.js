const multer = require("multer");
const path = require("path");
const fs = require("fs");
const csvParser = require("csv-parser");
const axios = require("axios");

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`,
    );
  },
});

const uploadSingle = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single("file");

// Transform parsed rows with ML predictions via the Flask service.
const applyMLTransformation = async (parsedData) => {
  const enriched = [];
  for (const row of parsedData) {
    try {
      const payload = {
        transactionId: row.transactionId || row.trans_num || row.transactionId,
        transactionTime: formatTransactionTime(
          row.transactionTime || row.trans_date_trans_time,
        ),
        ccNum: row.ccNum || row.cc_num,
        transactionType:
          row.transactionType || row.transaction_type || row.trannsaction_type,
        amount: parseFloat(row.amount || row.amt || 0),
        city: row.city || "",
        userLocation: {
          lat: parseFloat(row.userLat || row.lat || 0),
          lon: parseFloat(row.userLon || row.long || 0),
        },
        merchantLocation: {
          lat: parseFloat(row.merchantLat || row.merch_lat || 0),
          lon: parseFloat(row.merchantLon || row.merch_long || 0),
        },
      };

      const mlResponse = await axios.post(
        "http://localhost:5002/predict",
        payload,
        {
          headers: { "Content-Type": "application/json" },
          timeout: 30000,
        },
      );

      const mlData = mlResponse.data || {};
      const failedPrediction =
        !mlData ||
        mlData.error ||
        mlData.fraud_reason === "ml-error" ||
        mlData.is_fraud === undefined;

      if (failedPrediction) {
        // fallback to non-fraud predictions (clean behavior) when the ML endpoint fails.
        enriched.push({
          ...row,
          mlPrediction: false,
          mlConfidence: 0,
          mlFraudReason: null,
        });
      } else {
        enriched.push({
          ...row,
          mlPrediction:
            mlData.is_fraud === true ||
            String(mlData.is_fraud).toLowerCase() === "true",
          mlConfidence: Number(mlData.confidence ?? 0).toFixed
            ? Number(mlData.confidence)
            : Number(mlData.confidence ?? 0),
          mlFraudReason: mlData.fraud_reason ?? null,
        });
      }
    } catch (error) {
      console.error("ML call failed for row:", row, error.message || error);
      enriched.push({
        ...row,
        mlPrediction: false,
        mlConfidence: 0,
        mlFraudReason: null,
      });
    }
  }
  return enriched;
};

const formatTransactionTime = (value) => {
  if (!value) return "1970-01-01T00:00";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    // try parse from existing style d-m-Y etc or fallback
    return String(value).substring(0, 16);
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${h}:${min}`;
};

const uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  if (path.extname(req.file.originalname).toLowerCase() !== ".csv") {
    return res.status(400).json({ message: "Only CSV files are allowed." });
  }

  const parsedResults = [];
  const fileStream = fs.createReadStream(req.file.path);

  fileStream
    .pipe(csvParser())
    .on("data", (row) => {
      parsedResults.push(row);
    })
    .on("end", async () => {
      try {
        const transformedData = await applyMLTransformation(parsedResults);

        return res.status(201).json({
          message: "File uploaded and parsed successfully",
          filename: req.file.filename,
          path: req.file.path,
          size: req.file.size,
          data: transformedData,
        });
      } catch (error) {
        console.error("ML transformation failed", error);
        return res.status(500).json({ message: "ML processing failed" });
      }
    })
    .on("error", (error) => {
      console.error("CSV parsing error:", error);
      return res
        .status(500)
        .json({ message: "Error parsing CSV file", details: error.message });
    });
};

module.exports = {
  uploadSingle,
  uploadFile,
};
