# 🛒 NexCart – Smart Shopping Cart for a Smarter Retail Experience

> **Shop Smarter. Scan Faster. Queue Never.**

NexCart is an AI-powered smart shopping cart system designed to revolutionize the retail checkout experience. Built for the Smart India Hackathon under the **Smart Automation** theme, NexCart eliminates queues, speeds up billing, and delivers intelligent product recommendations—all while enhancing customer convenience and retail efficiency.

---

## 🚀 Key Features

- 🔍 **Barcode-based Product Detection** (using OpenCV + Pyzbar)
- ⚖️ **Weight Verification** with Load Sensors (Raspberry Pi)
- 💬 **Smart Recommendation Engine** (Association Rule Learning)
- 📟 **Touchscreen UI** for Real-Time Cart Updates
- 🔁 **Duplicate Scan Prevention** using cooldown logic
- 📡 **Live Communication** between React frontend & Flask backend
- 🔐 **Secure & Modular Architecture**

---

## 🧠 System Architecture

```
[ Customer ] → [ Cart Camera + Load Sensor ] → [ Raspberry Pi ]
                ↓                          ↑
          [ Flask Backend (Barcode, DB) ] ↔ [ MySQL ]
                ↓
       [ React Frontend Interface ]
```

---

## 🛠️ Tech Stack

| Layer       | Technology            |
|-------------|------------------------|
| Frontend    | React.js, CSS          |
| Backend     | Flask (Python), OpenCV, Pyzbar |
| Database    | MySQL                  |
| Hardware    | Raspberry Pi, Load Cell, Camera |
| APIs        | RESTful APIs (Fetch + Polling) |

---

## 💻 Demo Functionality

- 👁️ Place an item → Camera detects barcode
- 💾 Backend fetches item info from DB
- ⚖️ Load sensor verifies product weight
- 🧮 Product info & total cost shown on screen
- 🤖 Suggestions appear based on cart contents
- 🔄 Add/Remove mode to control item quantities
- ✅ One-click Checkout

---

## 🧬 Code Snippets

### 📸 Barcode Detection (Flask + OpenCV)

```python
@app.route('/start-video-feed', methods=['POST'])
def start_video_feed():
    cap = cv2.VideoCapture(0)
    while is_scanning:
        ret, frame = cap.read()
        codes = decode(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))
        for code in codes:
            data = code.data.decode('utf-8')
            if data in last_scan_times and time.time() - last_scan_times[data] < 10:
                continue
            # Fetch product from DB
```

### 🛒 Cart Handling (React.js)

```js
const handleProductScan = (product) => {
  const now = Date.now();
  if (recentlyScanned[product.name] && now - recentlyScanned[product.name] < 10000) return;
  setCart(prev => {
    let updated = [...prev];
    const index = updated.findIndex(p => p.name === product.name);
    if (isAddMode) {
      if (index >= 0) updated[index].quantity += 1;
      else updated.push({ ...product, quantity: 1 });
    } else {
      if (index >= 0) {
        updated[index].quantity -= 1;
        if (updated[index].quantity <= 0) updated.splice(index, 1);
      }
    }
    return updated;
  });
};
```

---

## 🧠 Recommendation Logic

- 🧾 Rule-based system using static mappings (e.g., Bread → Jam, Butter)
- 🔁 Displayed live below the cart in the React UI
- 🚀 Can be upgraded to Apriori/FP-Growth in the future

---

## ⚙️ Future Enhancements

- 🧠 ML-based Recommendation Engine (Collaborative Filtering)
- 📶 Switch from Polling to WebSocket for real-time detection
- 📱 Mobile App Companion for cart tracking
- 🧺 Support for unpackaged items via YOLO object detection
- 🧾 E-receipts and digital payment integration
- 🔐 Admin Panel with Authentication & Cart Management

---

## 🛡️ Security & Optimization

- ✅ CORS Protection for secure API access
- ✅ Parameterized SQL queries to prevent injection
- ⚡ Optimized detection with high-res camera settings
- 🚫 Duplicate scan filter via timestamp logic

---

## 📦 Installation & Usage

```bash
# Clone the repo
git clone https://github.com/SakethPinumalla/NexCart.git
cd NexCart

# Backend (Python)
cd backend
pip install -r requirements.txt
python app.py

# Frontend (React)
cd frontend
npm install
npm start
```

---

## 👨‍💻 Author

**Srinidhi Abushi**  
Finalist – Smart India Hackathon  
🚀 Tech Stack: Python, React, OpenCV, MySQL, Raspberry Pi  
---

## 📃 License

This project is licensed under the MIT License.

---

## 🫡 Motto

> **"Shop Smarter. Scan Faster. Queue Never."**  
> — The NexCart Way 🛒✨

