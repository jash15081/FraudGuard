from flask import Flask, request, jsonify
import pandas as pd
from datetime import datetime

app = Flask(__name__)

# Dummy run_inference
def run_inference(filepath):
    import random
    pred_flag = random.choice([0, 1])
    prob = round(random.uniform(0.1, 0.9), 4)
    reasons = ["dummy reason"]
    return pred_flag, prob, reasons

@app.route('/predict', methods=['POST'])
def preprocess_predict():
    try:
        data = request.get_json()
        formatted_time = datetime.strptime(data['transactionTime'], '%Y-%m-%dT%H:%M').strftime('%d-%m-%Y %H:%M')

        # Prepare the row as a dict
        row = {
            'trans_date_trans_time': formatted_time,
            'cc_num': data['ccNum'],
            'trannsaction_type': data['transactionType'],
            'amt': data['amount'],
            'city': data['city'],
            'lat': data['userLocation']['lat'],
            'long': data['userLocation']['lon'],
            'trans_num': data['transactionId'],
            'merch_lat': data['merchantLocation']['lat'],
            'merch_long': data['merchantLocation']['lon']
        }

        df = pd.DataFrame([row])
        df.to_csv('latest_transaction.csv', index=False)

        predicted_class, fraud_prob, fraud_reason = run_inference("latest_transaction.csv")

        response = {
            "is_fraud": bool(predicted_class),
            "confidence": float(fraud_prob),
            "fraud_reason": fraud_reason
        }
        return jsonify(response), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/')
def hello():
    return "Hello World"

if __name__ == '__main__':
    app.run(port=5002)
