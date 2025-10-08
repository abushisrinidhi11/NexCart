import React, { useState, useEffect } from "react";
import "./App.css";

const productRecommendations = {
  Bread: [{ name: "Jam", floor: 1, row: 3, brands: ["Brand A", "Brand B"] }],
  "Ponds Cream": [{ name: "Fogg Scent", floor: 2, row: 1, brands: ["Brand F"] }],
  "Fogg Scent": [{ name: "Ponds Cream", floor: 2, row: 1, brands: ["Brand L"] }],
  "Eta Dishwash": [{ name: "Sponges", floor: 3, row: 1, brands: ["Brand O"] }],
  "Water Bottle": [{ name: "Tiffin Box", floor: 4, row: 1, brands: ["Brand S"] }],
  "Surf Excel": [{ name: "Eta Dishwash", floor: 5, row: 1, brands: ["Brand W"] }]
};

const App = () => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [recentlyScanned, setRecentlyScanned] = useState({});
  const [notification, setNotification] = useState("");
  const [isAddMode, setIsAddMode] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [newItem, setNewItem] = useState("");

  // Start the video scanning
  const startVideoFeed = async () => {
    try {
      setLoading(true);
      setIsScanning(true);
      await fetch("http://127.0.0.1:5000/start-video-feed", { method: "POST" });
    } catch (error) {
      console.error("Error starting video feed:", error);
    } finally {
      setLoading(false);
    }
  };

  // Stop scanning
  const stopVideoFeed = async () => {
    try {
      await fetch("http://127.0.0.1:5000/stop-video-feed", { method: "POST" });
      setIsScanning(false);
      showNotification("Scanning stopped.");
    } catch (error) {
      console.error("Error stopping video feed:", error);
    }
  };

  // Checkout and download bill
  const checkout = async () => {
    setIsScanning(false);
    try {
      const response = await fetch("http://127.0.0.1:5000/checkout", { method: "POST" });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "NexCart_Bill.txt";
        document.body.appendChild(link);
        if (window.confirm("Download bill as text file?")) {
          link.click();
        }
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        showNotification("Checkout completed!");
        setCart([]);
        setRecommendations([]);
      } else {
        console.error("Error during checkout.");
      }
    } catch (error) {
      console.error("Error during checkout:", error);
    }
  };

  // Poll the server for product details
  const fetchProductDetails = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/get-product");
      if (response.ok) {
        const data = await response.json();
        handleProductScan(data);
      } else {
        // No product detected yet; do nothing
        console.log("No product detected yet");
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
    }
  };

  // Handle a scanned product (update cart)
  const handleProductScan = (product) => {
    const now = Date.now();
    if (!product || !product.name || !product.price) {
      console.error("Invalid product data");
      return;
    }
    // Avoid duplicate scans within 10 seconds
    if (recentlyScanned[product.name] && now - recentlyScanned[product.name] < 10000) {
      console.log("Product scanned within 10 seconds. Ignoring...");
      return;
    }

    setCart((prevCart) => {
      const updatedCart = [...prevCart];
      const idx = updatedCart.findIndex((item) => item.name === product.name);
      if (isAddMode) {
        // Add mode: increase quantity or add new item
        if (idx >= 0) {
          updatedCart[idx].quantity += 1;
        } else {
          updatedCart.push({ ...product, quantity: 1 });
        }
        showNotification(`Added ${product.name} to cart`);
        if (productRecommendations[product.name]) {
          setRecommendations(productRecommendations[product.name]);
        }
      } else {
        // Remove mode: decrease quantity or remove item
        if (idx >= 0) {
          updatedCart[idx].quantity -= 1;
          if (updatedCart[idx].quantity <= 0) {
            updatedCart.splice(idx, 1);
          }
          showNotification(`Removed ${product.name} from cart`);
        } else {
          showNotification(`${product.name} not in cart to remove`);
        }
        setRecommendations([]);
      }
      return updatedCart;
    });

    setRecentlyScanned((prev) => ({
      ...prev,
      [product.name]: now
    }));
  };

  // Show temporary notifications
  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => {
      setNotification("");
    }, 3000);
  };

  // Toggle between Add and Remove mode
  const handleModeChange = async () => {
    const newMode = isAddMode ? 'remove' : 'add';  // what we want to switch to
    try {
      await fetch("http://127.0.0.1:5000/set-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode })
      });
      setIsAddMode(!isAddMode);  // update local state
      // Reset recently scanned on mode change, so remove can act immediately
      setRecentlyScanned({});
    } catch (error) {
      console.error("Failed to set mode:", error);
    }
  };

  // Poll the server every 3 seconds when scanning is active.
  useEffect(() => {
    let intervalId;
    if (isScanning) {
      // Note: include isAddMode in the dependency array to capture its latest value:contentReference[oaicite:6]{index=6}:contentReference[oaicite:7]{index=7}
      intervalId = setInterval(fetchProductDetails, 3000);
    }
    return () => clearInterval(intervalId);
  }, [isScanning, isAddMode]);  // added isAddMode here

  // Functions for managing the custom checklist (unchanged)
  const addItemToChecklist = () => {
    if (newItem) {
      setChecklist((prev) => [...prev, { name: newItem, checked: false }]);
      setNewItem("");
    }
  };

  return (
    <div className="app-container">
      <h1 className="header">NexCart</h1>
      {notification && <div className="notification-popup">{notification}</div>}

      <div className="controls">
        <button
          className="start-scan-btn"
          onClick={startVideoFeed}
          disabled={isScanning || loading}
        >
          {loading ? "Starting..." : "Start Scanning"}
        </button>
        <button
          className="stop-scan-btn"
          onClick={stopVideoFeed}
          disabled={!isScanning}
        >
          Stop Scanning
        </button>

        <div className="toggle-switch-container">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={isAddMode}
              onChange={handleModeChange}
            />
            <span className="slider"></span>
          </label>
          <span className="toggle-label">
            {isAddMode ? "Add Mode" : "Remove Mode"}
          </span>
        </div>
      </div>

      <div className="checklist-container">
        <h2>Checklist</h2>
        <div className="checklist-input">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add a product"
          />
          <button onClick={addItemToChecklist}>Add</button>
        </div>
        <ul className="checklist">
          {checklist.map((item, idx) => (
            <li key={idx} className={item.checked ? "checked" : ""}>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() =>
                  setChecklist((prev) =>
                    prev.map((i, iIdx) =>
                      iIdx === idx ? { ...i, checked: !i.checked } : i
                    )
                  )
                }
              />
              {item.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="cart-container">
        <h2>Cart</h2>
        <table className="cart-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Price</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((p) => (
              <tr key={p.name}>
                <td>{p.name}</td>
                <td>${p.price.toFixed(2)}</td>
                <td>{p.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="total">
          <h3>
            Total: $
            {cart.reduce((total, p) => total + p.price * p.quantity, 0).toFixed(2)}
          </h3>
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="recommendations">
          <h3>Recommended Products</h3>
          <div className="recommendations-grid">
            {recommendations.map((item) => (
              <div key={item.name} className="recommendation-card">
                {item.name}
                <div className="tooltip">
                  Floor: {item.floor}, Row: {item.row}
                  <br />
                  Available Brands: {item.brands.join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        className="checkout-btn"
        onClick={checkout}
        disabled={cart.length === 0}
      >
        Checkout
      </button>
    </div>
  );
};

export default App;
