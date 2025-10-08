from flask import Flask, jsonify, send_file, request
import cv2
import mysql.connector
from flask_cors import CORS
import logging
import time
from ultralytics import YOLO
import os

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Globals
isAddMode = True            # True = Add mode, False = Remove mode
scanned_product = None      # Last detected product (for frontend)
is_scanning = False
scanned_products = {}       # {product_id: {name, price, quantity}}
last_scan_times = {}        # {product_id: timestamp of last scan}

# MySQL Connection
try:
    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="saketh21@vce",
        database="nexcart"
    )
    cursor = db.cursor()
    logging.info("Connected to MySQL database.")
except mysql.connector.Error as err:
    logging.error(f"Error connecting to MySQL: {err}")
    exit(1)

# Load YOLO model
model_path = "best1.pt"
model = YOLO(model_path)
logging.info("YOLO model loaded successfully.")

def detect_objects(img):
    """
    Run YOLO on the image and return a list of detected labels (class names).
    """
    results = model(img, verbose=False, conf=0.8)
    labels = []
    for box in results[0].boxes:
        conf_score = float(box.conf[0].item())
        if conf_score < 0.8:
            continue
        cls_id = int(box.cls[0].item())
        label = results[0].names[cls_id]
        labels.append(label)
    return labels

@app.route('/set-mode', methods=['POST'])
def set_mode():
    """
    Set scanning mode: add or remove items.
    """
    global isAddMode, last_scan_times
    data = request.get_json() or {}
    mode = data.get("mode", "").lower()
    if mode == "remove":
        isAddMode = False
    else:
        isAddMode = True
    logging.info(f"Mode set to {'Add' if isAddMode else 'Remove'}.")

    # Clear debounce timers on mode change
    last_scan_times.clear()
    return jsonify({"mode": "add" if isAddMode else "remove"}), 200

@app.route('/start-video-feed', methods=['POST'])
def start_video_feed():
    """
    Start the video capture and object detection loop.
    """
    global scanned_product, is_scanning, scanned_products, last_scan_times

    is_scanning = True
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FPS, 30)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    logging.info("Video feed started.")
    while is_scanning:
        ret, frame = cap.read()
        if not ret:
            logging.warning("Failed to grab frame from camera.")
            break

        objects = detect_objects(frame)

        if objects:
            # Only process each detected product once per loop
            for product_id in set(objects):
                current_time = time.time()
                # Debounce check (skip if seen recently)
                if product_id in last_scan_times and (current_time - last_scan_times[product_id]) < 10:
                    continue

                try:
                    # Lookup product in database
                    cursor.execute(
                        "SELECT product_name, price FROM products WHERE product_id = %s",
                        (product_id,)
                    )
                    result = cursor.fetchone()
                    if not result:
                        logging.warning(f"Product ID '{product_id}' not found.")
                        continue

                    name, price = result
                    price = float(price)

                    # Determine add or remove logic
                    if product_id in scanned_products:
                        if isAddMode:
                            scanned_products[product_id]['quantity'] += 1
                        else:
                            scanned_products[product_id]['quantity'] -= 1
                            if scanned_products[product_id]['quantity'] <= 0:
                                del scanned_products[product_id]
                    else:
                        if isAddMode:
                            # Add new item to cart
                            scanned_products[product_id] = {'name': name, 'price': price, 'quantity': 1}
                        else:
                            # Remove mode but item not in cart: skip
                            logging.info(f"Item '{name}' not in cart; cannot remove.")
                            continue

                    # Only set scanned_product on successful add/remove
                    scanned_product = {'name': name, 'price': price}
                    last_scan_times[product_id] = current_time
                    action = "Added" if isAddMode else "Removed"
                    logging.info(f"{action}: {name} (${price:.2f})")

                    # Brief pause to avoid flooding detections of the same frame
                    time.sleep(2)
                    break  # exit the for-loop after one product
                except mysql.connector.Error as err:
                    logging.error(f"Database error: {err}")

        # Display frame (optional; remove if headless)
        cv2.imshow("YOLO Object Detection", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            is_scanning = False

    cap.release()
    cv2.destroyAllWindows()
    logging.info("Video feed stopped.")
    return jsonify({'message': 'Scanning stopped'}), 200

@app.route('/stop-video-feed', methods=['POST'])
def stop_video_feed():
    """
    Stop the video scanning loop.
    """
    global is_scanning
    is_scanning = False
    logging.info("Scanning stopped by user.")
    return jsonify({'message': 'Scanning stopped by user'}), 200

@app.route('/get-product', methods=['GET'])
def get_product_details():
    """
    Return the last scanned product to the frontend, then clear it.
    """
    global scanned_product
    if scanned_product:
        product_to_return = scanned_product
        scanned_product = None
        return jsonify(product_to_return), 200
    else:
        return jsonify({'message': 'No product detected yet'}), 404

@app.route('/checkout', methods=['POST'])
def checkout():
    """
    Generate a bill from scanned_products and return it as a file.
    """
    global is_scanning, scanned_products
    is_scanning = False

    products_list = list(scanned_products.values())
    bill_lines = []
    total = 0.0

    bill_lines.append("Product\t\tPrice\tQty\n")
    for p in products_list:
        line = f"{p['name']}\t${p['price']:.2f}\t{p['quantity']}"
        bill_lines.append(line)
        total += p['price'] * p['quantity']
    bill_lines.append(f"\nTotal: ${total:.2f}\n")

    bill_content = "\n".join(bill_lines)
    bill_path = "nexcart_bill.txt"
    with open(bill_path, "w") as f:
        f.write(bill_content)

    scanned_products.clear()
    return send_file(bill_path, as_attachment=True)

if __name__ == '__main__':
    app.run(port=5000)
