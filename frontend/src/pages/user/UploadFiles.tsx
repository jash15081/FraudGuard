import React, { useState } from "react";
import { motion } from "framer-motion";
import MainLayout from "../../layouts/MainLayout";
import GlassCard from "../../components/ui/GlassCard";
import AnimatedButton from "../../components/ui/AnimatedButton";
import { userAPI } from "../../services/api";

const UploadFiles: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<Array<Record<string, any>>>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatus(null);
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setParsedData([]);
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus("Please select a file before uploading.");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await userAPI.uploadFile(file);
      setStatus(`Upload successful: ${response.data.message || "file saved"}`);
      setParsedData(response.data.data || []);
      setFile(null);
    } catch (error: any) {
      console.error("Upload failed:", error);
      setStatus(error?.response?.data?.message || "Upload failed, try again.");
      setParsedData([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const cleaned = parsedData.filter(
      (row) => row.mlFraudReason !== "ml-error",
    );
    if (cleaned.length === 0) {
      setStatus("No fully-predicted rows available to download.");
      return;
    }

    const headers = Object.keys(cleaned[0]).filter(
      (h) => h !== "mlFraudReason",
    );
    const csvContent = [
      headers.join(","),
      ...cleaned.map((row) =>
        headers
          .map((h) => {
            const cell = row[h] ?? "";
            return `"${String(cell).replace(/"/g, '""')}"`;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "predicted_transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <motion.div
          className="text-white"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold font-display">Upload Files</h1>
          <p className="text-white/70 mt-1">
            Select a file and send it to the server.
          </p>
        </motion.div>

        <GlassCard className="p-6">
          <div className="space-y-4">
            <input
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-700 file:text-white hover:file:bg-blue-600"
            />

            <AnimatedButton
              onClick={handleUpload}
              variant="primary"
              size="lg"
              disabled={loading || !file}
            >
              {loading ? "Uploading..." : "Upload File"}
            </AnimatedButton>

            {status && <div className="text-sm text-white/80">{status}</div>}
          </div>
        </GlassCard>

        {parsedData.length > 0 && (
          <div className="space-y-4">
            <GlassCard className="p-4">
              <AnimatedButton
                onClick={downloadCSV}
                variant="secondary"
                size="md"
              >
                Download Predicted CSV
              </AnimatedButton>
            </GlassCard>
            {parsedData.map((row, i) => {
              const isFraud =
                row.mlPrediction === true ||
                String(row.mlPrediction).toLowerCase() === "true";
              const statusText = isFraud ? "Fraud" : "Legit";
              const statusColor = isFraud
                ? "bg-red-600 text-red-100"
                : "bg-green-600 text-green-100";
              return (
                <GlassCard key={i} className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
                      <div>
                        <p className="text-xs text-white/70">Transaction ID</p>
                        <p className="text-sm font-medium text-white truncate">
                          {row.transactionId || row.trans_num || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/70">Date/Time</p>
                        <p className="text-sm font-medium text-white">
                          {row.transactionTime ||
                            row.trans_date_trans_time ||
                            "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/70">Amount</p>
                        <p className="text-sm font-medium text-white">
                          {row.amount || row.amt || "-"}{" "}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/70">Type</p>
                        <p className="text-sm font-medium text-white">
                          {row.transactionType ||
                            row.transaction_type ||
                            row.trannsaction_type ||
                            "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/70">City</p>
                        <p className="text-sm font-medium text-white">
                          {row.city || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/70">Card</p>
                        <p className="text-sm font-medium text-white">
                          {row.ccNum
                            ? `${row.ccNum.slice(0, 4)}****${row.ccNum.slice(-4)}`
                            : row.cc_num || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}
                      >
                        {statusText}
                      </span>
                      {row.mlConfidence != null && (
                        <span className="text-xs text-white/70">
                          {`Confidence ${Number(row.mlConfidence).toFixed(2)}`}
                        </span>
                      )}
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default UploadFiles;
