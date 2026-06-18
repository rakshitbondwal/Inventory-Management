// Trigger Vercel rebuild for environment variables update
import { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/products";

const generateUniqueId = () => {
  return Math.random().toString(36).substring(2, 9);
};

function App() {
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentProductId, setCurrentProductId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);

  // Router and Local States for Tabs
  const [activeTab, setActiveTab] = useState("Dashboard");
  
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("stockvault_user");
    return saved ? JSON.parse(saved) : {
      name: "John Doe",
      email: "john.doe@stockvault.com",
      role: "Inventory Manager",
      avatarColor: "#0f172a"
    };
  });

  const [systemSettings, setSystemSettings] = useState(() => {
    const saved = localStorage.getItem("stockvault_settings");
    return saved ? JSON.parse(saved) : {
      currency: "₹",
      lowStockThreshold: 5,
      darkMode: false
    };
  });

  const [activities, setActivities] = useState(() => {
    const saved = localStorage.getItem("stockvault_activities");
    return saved ? JSON.parse(saved) : [
      { id: "act-1", text: "Database connection initialized", timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), type: "system" },
      { id: "act-2", text: "Pre-seeded 5 inventory products locally", timestamp: new Date(Date.now() - 3600000).toISOString(), type: "system" }
    ];
  });

  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "",
    quantity: "",
    price: "",
    lowStockThreshold: "",
  });
  const [error, setError] = useState("");

  const fetchProducts = async () => {
    try {
      const res = await axios.get(API_URL);
      setProducts(res.data);
    } catch (err) {
      setError(`Could not load products from "${API_URL}". Is the backend running?`);
      console.error(err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts();
  }, []);

  useEffect(() => {
    if (systemSettings.darkMode) {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
    localStorage.setItem("stockvault_settings", JSON.stringify(systemSettings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemSettings.darkMode]);

  const logActivity = (text, type = "info") => {
    const newAct = {
      id: "act-" + generateUniqueId(),
      text,
      timestamp: new Date().toISOString(),
      type
    };
    setActivities(prev => {
      const updated = [newAct, ...prev].slice(0, 30);
      localStorage.setItem("stockvault_activities", JSON.stringify(updated));
      return updated;
    });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const productData = {
        name: form.name,
        sku: form.sku,
        category: form.category,
        quantity: Number(form.quantity) || 0,
        price: Number(form.price),
        lowStockThreshold: Number(form.lowStockThreshold) || Number(systemSettings.lowStockThreshold) || 5,
      };

      if (isEditMode) {
        await axios.put(`${API_URL}/${currentProductId}`, productData);
        logActivity(`Updated product "${productData.name}" details`, "update");
      } else {
        await axios.post(API_URL, productData);
        logActivity(`Created product "${productData.name}" (SKU: ${productData.sku})`, "create");
      }

      setForm({ name: "", sku: "", category: "", quantity: "", price: "", lowStockThreshold: "" });
      setIsModalOpen(false);
      setIsEditMode(false);
      setCurrentProductId(null);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save product");
    }
  };

  const handleDelete = async (id) => {
    const p = products.find(prod => prod._id === id);
    const pName = p ? p.name : "product";
    if (window.confirm(`Are you sure you want to delete "${pName}"?`)) {
      try {
        await axios.delete(`${API_URL}/${id}`);
        logActivity(`Deleted product "${pName}" from inventory`, "delete");
        setOpenDropdownId(null);
        fetchProducts();
      } catch (err) {
        setError("Failed to delete product");
        console.error(err);
      }
    }
  };

  const handleAdjust = async (id, change) => {
    const p = products.find(prod => prod._id === id);
    const pName = p ? p.name : "product";
    try {
      await axios.post(`${API_URL}/${id}/adjust`, { change });
      const newQty = p ? Math.max(0, p.quantity + change) : 0;
      logActivity(`Adjusted stock of "${pName}" (${change > 0 ? "+" : ""}${change}) to ${newQty}`, "adjust");
      fetchProducts();
    } catch (err) {
      setError("Failed to adjust stock");
      console.error(err);
    }
  };

  const openAddModal = () => {
    setForm({ name: "", sku: "", category: "", quantity: "", price: "", lowStockThreshold: systemSettings.lowStockThreshold });
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const openEditModal = (p, e) => {
    e.stopPropagation();
    setForm({
      name: p.name,
      sku: p.sku,
      category: p.category,
      quantity: p.quantity,
      price: p.price,
      lowStockThreshold: p.lowStockThreshold,
    });
    setCurrentProductId(p._id);
    setIsEditMode(true);
    setIsModalOpen(true);
    setOpenDropdownId(null);
  };

  const toggleDropdown = (id, e) => {
    e.stopPropagation();
    setOpenDropdownId(openDropdownId === id ? null : id);
  };

  // Close dropdowns when clicking anywhere else
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenDropdownId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const getUnit = (name, category) => {
    const n = name.toLowerCase();
    const c = category.toLowerCase();
    if (n.includes("tomato") || n.includes("chicken") || n.includes("pasta") || n.includes("pepper")) return "kg";
    if (n.includes("oil")) return "L";
    if (n.includes("egg")) return "pcs";
    if (c.includes("food") || c.includes("grocery")) return "kg";
    return "pcs";
  };

  const getStorageLocation = (name, category) => {
    const n = name.toLowerCase();
    const c = category.toLowerCase();
    if (n.includes("tomato") || n.includes("chicken") || n.includes("egg") || n.includes("pepper")) return "Freezer";
    if (n.includes("pasta") || n.includes("oil")) return "Pantry";
    if (c.includes("food") || c.includes("grocery")) return "Pantry";
    if (c.includes("electronic")) return "Tech Lab";
    if (c.includes("furniture")) return "Warehouse";
    return "Storage Room";
  };

  const getStatus = (p) => {
    if (p.name.toLowerCase() === "pasta" || p.sku.toLowerCase().includes("exp")) return "Expired";
    if (p.quantity === 0) return "Out of Stock";
    if (p.quantity < p.lowStockThreshold) return "Low Stock";
    return "Good";
  };

  const formatLastUpdated = (updatedAt) => {
    if (!updatedAt) return "-";
    const date = new Date(updatedAt);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + ", " + date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getFormattedDate = () => {
    const date = new Date();
    const options = { month: "long", year: "numeric" };
    const monthYear = date.toLocaleDateString("en-US", options);
    const day = date.getDate();
    
    let suffix = "th";
    if (day === 1 || day === 21 || day === 31) suffix = "st";
    else if (day === 2 || day === 22) suffix = "nd";
    else if (day === 3 || day === 23) suffix = "rd";

    return `Today, ${monthYear.split(" ")[0]} ${day}${suffix} ${monthYear.split(" ")[1]}`;
  };

  // Profile Save
  const handleProfileSave = (e) => {
    e.preventDefault();
    localStorage.setItem("stockvault_user", JSON.stringify(user));
    logActivity("Updated user profile configurations", "system");
    alert("Profile saved successfully!");
  };

  // Settings Save
  const handleSettingsSave = (e) => {
    e.preventDefault();
    localStorage.setItem("stockvault_settings", JSON.stringify(systemSettings));
    logActivity("Updated default configurations", "system");
    alert("Configurations saved successfully!");
  };

  // Export JSON Data
  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `stockvault_inventory_backup_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    logActivity("Exported inventory database to JSON backup", "system");
  };

  // Calculations for Stats Cards
  const totalItems = products.reduce((acc, p) => acc + p.quantity, 0);
  const lowStockCount = products.filter((p) => getStatus(p) === "Low Stock").length;
  const expiredCount = products.filter((p) => getStatus(p) === "Expired").length;
  const outOfStockCount = products.filter((p) => getStatus(p) === "Out of Stock").length;

  // Filter products based on search and category
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Extract unique categories for filter dropdown
  const categories = ["All", ...new Set(products.map((p) => p.category))];

  // Dashboard Specific Analytics
  const topValuedProducts = [...products]
    .sort((a, b) => (b.quantity * b.price) - (a.quantity * a.price))
    .slice(0, 3);

  const totalValue = products.reduce((acc, p) => acc + (p.quantity * p.price), 0);

  const categoryBreakdown = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + p.quantity;
    return acc;
  }, {});

  const formatActivityTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar Layout */}
      <aside className="sidebar">
        <div className="logo-container">
          <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 7.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5M21 4H3a1 1 0 0 0-1 1v2.5a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1Z" />
            <path d="M12 11v4M8 13h8" />
          </svg>
          <span className="logo-text">StockVault</span>
        </div>

        <nav className="nav-menu">
          <div 
            className={`nav-item ${activeTab === "Dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("Dashboard")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="9" rx="1" />
              <rect x="14" y="3" width="7" height="5" rx="1" />
              <rect x="14" y="12" width="7" height="9" rx="1" />
              <rect x="3" y="16" width="7" height="5" rx="1" />
            </svg>
            Dashboard
          </div>
          <div 
            className={`nav-item ${activeTab === "Inventory" ? "active" : ""}`}
            onClick={() => setActiveTab("Inventory")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Inventory
          </div>
          <div 
            className={`nav-item ${activeTab === "MenuPlanner" ? "active" : ""}`}
            onClick={() => setActiveTab("MenuPlanner")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9M3 20h9M3 12h18M3 4h18" />
            </svg>
            Menu planner
          </div>
          <div 
            className={`nav-item ${activeTab === "Staff" ? "active" : ""}`}
            onClick={() => setActiveTab("Staff")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Staff management
          </div>
          <div 
            className={`nav-item ${activeTab === "Shopping" ? "active" : ""}`}
            onClick={() => setActiveTab("Shopping")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Shopping
          </div>
          <div 
            className={`nav-item ${activeTab === "FoodSafety" ? "active" : ""}`}
            onClick={() => setActiveTab("FoodSafety")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Food safety
          </div>
          <div 
            className={`nav-item ${activeTab === "Reports" ? "active" : ""}`}
            onClick={() => setActiveTab("Reports")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
            </svg>
            Reports and analysis
          </div>
        </nav>

        <div className="sidebar-footer">
          <div 
            className={`nav-item ${activeTab === "Settings" ? "active" : ""}`}
            onClick={() => setActiveTab("Settings")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </div>
          <div 
            className="nav-item logout"
            onClick={() => {
              if (window.confirm("Are you sure you want to log out?")) {
                logActivity(`Logged out user session: ${user.name}`, "system");
                alert("Logged out successfully!");
              }
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Log out
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-titles">
            <h1>Inventory Management</h1>
            <p className="subtitle">{getFormattedDate()}</p>
          </div>
          
          <div className="search-bar">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="header-actions">
            <button className="notification-btn" onClick={() => alert("No new notifications")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="badge-dot"></span>
            </button>
            
            <div className="user-profile" onClick={() => setActiveTab("Profile")} title="Edit Profile">
              <div className="user-avatar" style={{ backgroundColor: user.avatarColor }}>
                {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
              </div>
              <span className="user-name">{user.name}</span>
              <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="error-banner">
            <span className="error-text">{error}</span>
            <button className="error-close" onClick={() => setError("")}>&times;</button>
          </div>
        )}

        {/* Global Stats Cards Grid (Visible for both Dashboard and Inventory tabs) */}
        {(activeTab === "Dashboard" || activeTab === "Inventory") && (
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon-wrapper total">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-title">Total Items</span>
                <span className="stat-desc">Total items in stock</span>
                <span className="stat-value">{totalItems}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper low-stock">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-title">Low Stock Items</span>
                <span className="stat-desc">Number of items running low</span>
                <span className="stat-value">{lowStockCount}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper expired">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-title">Expired Items</span>
                <span className="stat-desc">Number of items past expiration</span>
                <span className="stat-value">{expiredCount}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper out-of-stock">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v1.5M21 7.5v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5M21 7.5H3M16 11.5h-8" />
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-title">Out of Stock Items</span>
                <span className="stat-desc">Count of items currently out of stock</span>
                <span className="stat-value">{outOfStockCount}</span>
              </div>
            </div>
          </section>
        )}

        {/* Dynamic Route Content Router */}
        
        {/* VIEW: DASHBOARD */}
        {activeTab === "Dashboard" && (
          <div className="dashboard-view-layout">
            <div className="dashboard-grid-left">
              {/* Financial Summary */}
              <div className="analytics-card card-total-value">
                <h3>Financial Valuation</h3>
                <p className="val-desc">Net worth of current local inventory assets</p>
                <div className="net-worth-number">{systemSettings.currency}{totalValue.toLocaleString()}</div>
              </div>

              {/* Category allocation progress bars */}
              <div className="analytics-card card-category-split">
                <h3>Category Allocation</h3>
                <p className="val-desc">Distribution of item quantities by category</p>
                <div className="progress-bars-container">
                  {Object.keys(categoryBreakdown).length === 0 ? (
                    <p className="empty-subtext">No categories present.</p>
                  ) : (
                    Object.entries(categoryBreakdown).map(([cat, qty]) => {
                      const percentage = totalItems > 0 ? Math.round((qty / totalItems) * 100) : 0;
                      return (
                        <div className="progress-row" key={cat}>
                          <div className="progress-labels">
                            <span className="progress-cat-name">{cat}</span>
                            <span className="progress-cat-pct">{qty} units ({percentage}%)</span>
                          </div>
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Top value products */}
              <div className="analytics-card card-top-products">
                <h3>Top Performing Assets</h3>
                <p className="val-desc">Top 3 items with highest stock value</p>
                <div className="top-products-list">
                  {topValuedProducts.length === 0 ? (
                    <p className="empty-subtext">No products registered.</p>
                  ) : (
                    topValuedProducts.map((p) => (
                      <div className="top-product-row" key={p._id}>
                        <div className="top-product-details">
                          <span className="top-product-name">{p.name}</span>
                          <span className="top-product-meta">{p.category} | {p.quantity} units</span>
                        </div>
                        <div className="top-product-value">
                          {systemSettings.currency}{(p.quantity * p.price).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Recent activities log */}
            <div className="dashboard-grid-right">
              <div className="analytics-card card-activity-log">
                <h3>Recent Action Registry</h3>
                <p className="val-desc">System logs and CRUD events</p>
                <div className="activity-timeline">
                  {activities.map((act) => (
                    <div className="activity-timeline-item" key={act.id}>
                      <div className="activity-bullet"></div>
                      <div className="activity-content">
                        <p className="activity-text">{act.text}</p>
                        <span className="activity-time">{formatActivityTime(act.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: INVENTORY */}
        {activeTab === "Inventory" && (
          <section className="inventory-section">
            <div className="inventory-header">
              <h2>Inventory Overview</h2>
              
              <div className="inventory-controls">
                <div className="search-item-bar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <input 
                    type="text" 
                    placeholder="Search item..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="filter-dropdown-wrapper">
                  <svg className="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  <select 
                    className="filter-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="All">All Categories</option>
                    {categories.filter(c => c !== "All").map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <button className="add-item-btn" onClick={openAddModal}>
                  Add Item+
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th width="40px">
                      <input type="checkbox" className="custom-checkbox" readOnly />
                    </th>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Storage Location</th>
                    <th>Last Updated</th>
                    <th>Status</th>
                    <th width="100px" style={{ textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-row">No products found matching filters.</td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const status = getStatus(p);
                      let statusClass = "status-good";
                      if (status === "Low Stock") statusClass = "status-low";
                      if (status === "Out of Stock") statusClass = "status-out";
                      if (status === "Expired") statusClass = "status-expired";

                      return (
                        <tr key={p._id}>
                          <td>
                            <input type="checkbox" className="custom-checkbox" readOnly />
                          </td>
                          <td className="product-name-cell">
                            <div>
                              <span className="p-name">{p.name}</span>
                              <span className="p-sku">{p.sku}</span>
                            </div>
                          </td>
                          <td>
                            <div className="quantity-cell">
                              <span className="quantity-val">{p.quantity} {getUnit(p.name, p.category)}</span>
                              <div className="adjust-actions">
                                <button 
                                  className="adjust-btn plus"
                                  onClick={(e) => { e.stopPropagation(); handleAdjust(p._id, 1); }}
                                  title="Increase Stock"
                                >
                                  +
                                </button>
                                <button 
                                  className="adjust-btn minus"
                                  onClick={(e) => { e.stopPropagation(); handleAdjust(p._id, -1); }}
                                  title="Decrease Stock"
                                >
                                  -
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="location-cell">{getStorageLocation(p.name, p.category)}</td>
                          <td className="date-cell">{formatLastUpdated(p.updatedAt)}</td>
                          <td>
                            <span className={`status-badge ${statusClass}`}>{status}</span>
                          </td>
                          <td>
                            <div className="actions-cell">
                              <button 
                                className="edit-icon-btn" 
                                onClick={(e) => openEditModal(p, e)}
                                title="Edit Product"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
                              </button>
                              <div className="dropdown-container">
                                <button 
                                  className="more-btn" 
                                  onClick={(e) => toggleDropdown(p._id, e)}
                                  title="More Actions"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="1" />
                                    <circle cx="19" cy="12" r="1" />
                                    <circle cx="5" cy="12" r="1" />
                                  </svg>
                                </button>
                                
                                {openDropdownId === p._id && (
                                  <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={(e) => openEditModal(p, e)}>
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                      </svg>
                                      Edit Details
                                    </button>
                                    <button onClick={() => setSelectedProductDetails(p)}>
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="16" x2="12" y2="12" />
                                        <line x1="12" y1="8" x2="12.01" y2="8" />
                                      </svg>
                                      View Details
                                    </button>
                                    <button className="danger-action" onClick={() => handleDelete(p._id)}>
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                                      </svg>
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* VIEW: PROFILE */}
        {activeTab === "Profile" && (
          <section className="profile-section">
            <div className="form-card-container">
              <div className="profile-header-card">
                <div className="profile-large-avatar" style={{ backgroundColor: user.avatarColor }}>
                  {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                </div>
                <div className="profile-titles">
                  <h2>{user.name}</h2>
                  <p className="profile-role">{user.role}</p>
                </div>
              </div>

              <form className="profile-form" onSubmit={handleProfileSave}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    value={user.name} 
                    onChange={(e) => setUser({...user, name: e.target.value})}
                    required 
                  />
                </div>
                
                <div className="form-group">
                  <label>Manager Role</label>
                  <input 
                    type="text" 
                    value={user.role} 
                    onChange={(e) => setUser({...user, role: e.target.value})}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    value={user.email} 
                    onChange={(e) => setUser({...user, email: e.target.value})}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Profile Theme Color</label>
                  <div className="avatar-color-row">
                    {["#0f172a", "#2563eb", "#16a34a", "#dc2626", "#7c3aed"].map((color) => (
                      <div 
                        key={color}
                        className={`color-circle ${user.avatarColor === color ? "active" : ""}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setUser({...user, avatarColor: color})}
                      ></div>
                    ))}
                  </div>
                </div>

                <div className="form-actions-row">
                  <button type="submit" className="btn-submit">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* VIEW: SETTINGS */}
        {activeTab === "Settings" && (
          <section className="settings-section">
            <div className="form-card-container">
              <h2>Configurations & Preferences</h2>
              <p className="settings-intro">Configure local variables and visual settings for the dashboard.</p>
              
              <form className="settings-form" onSubmit={handleSettingsSave}>
                <div className="settings-row">
                  <div className="settings-meta">
                    <span className="settings-title">Visual Dark Theme</span>
                    <span className="settings-desc">Switch dashboard coloring scheme to dark elements</span>
                  </div>
                  <button 
                    type="button"
                    className={`toggle-switch-btn ${systemSettings.darkMode ? "active" : ""}`}
                    onClick={() => setSystemSettings({...systemSettings, darkMode: !systemSettings.darkMode})}
                  >
                    <span className="switch-knob"></span>
                  </button>
                </div>

                <div className="settings-row">
                  <div className="settings-meta">
                    <span className="settings-title">System Currency Symbol</span>
                    <span className="settings-desc">Display valuation metrics in your local currency</span>
                  </div>
                  <select 
                    className="currency-select-box"
                    value={systemSettings.currency}
                    onChange={(e) => setSystemSettings({...systemSettings, currency: e.target.value})}
                  >
                    <option value="₹">₹ (INR)</option>
                    <option value="$">$ (USD)</option>
                    <option value="€">€ (EUR)</option>
                    <option value="£">£ (GBP)</option>
                  </select>
                </div>

                <div className="settings-row">
                  <div className="settings-meta">
                    <span className="settings-title">Default Stock Threshold</span>
                    <span className="settings-desc">Global alert limit for low stock items</span>
                  </div>
                  <input 
                    type="number" 
                    className="threshold-input-box"
                    value={systemSettings.lowStockThreshold}
                    min="1"
                    max="100"
                    onChange={(e) => setSystemSettings({...systemSettings, lowStockThreshold: Number(e.target.value)})}
                  />
                </div>

                <div className="settings-row no-border">
                  <div className="settings-meta">
                    <span className="settings-title">Export Database</span>
                    <span className="settings-desc">Download a local .json file copy of the inventory</span>
                  </div>
                  <button type="button" className="btn-cancel" onClick={exportData}>
                    Export Data
                  </button>
                </div>

                <div className="form-actions-row">
                  <button type="submit" className="btn-submit">
                    Save Preferences
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* VIEW: MOCK COMING SOON PLACES */}
        {(activeTab === "MenuPlanner" || activeTab === "Staff" || activeTab === "Shopping" || activeTab === "FoodSafety" || activeTab === "Reports") && (
          <section className="mock-coming-soon-section">
            <div className="mock-card">
              <div className="mock-icon-avatar">
                {activeTab === "MenuPlanner" && "📋"}
                {activeTab === "Staff" && "👥"}
                {activeTab === "Shopping" && "🛒"}
                {activeTab === "FoodSafety" && "🛡️"}
                {activeTab === "Reports" && "📈"}
              </div>
              <h2>
                {activeTab === "MenuPlanner" && "Menu Planner"}
                {activeTab === "Staff" && "Staff Management"}
                {activeTab === "Shopping" && "Shopping Lists"}
                {activeTab === "FoodSafety" && "Food Safety Audits"}
                {activeTab === "Reports" && "Reports & Analytics"}
                {" (Coming Soon)"}
              </h2>
              <p>
                We are actively developing this module to integrate directly with your product logs. 
                In a future update, you will be able to schedule employee shifts, compile automated shopping list templates, and generate PDF report layouts right from this screen!
              </p>
              <button className="btn-submit" onClick={() => setActiveTab("Dashboard")}>
                Return to Dashboard
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isEditMode ? "Edit Product Details" : "Add New Product"}</h3>
              <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}>
                &times;
              </button>
            </div>
            
            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Item Name *</label>
                <input 
                  name="name" 
                  placeholder="e.g. Tomatoes" 
                  value={form.name} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div className="form-group">
                <label>SKU (Stock Keeping Unit) *</label>
                <input 
                  name="sku" 
                  placeholder="e.g. TM-001" 
                  value={form.sku} 
                  onChange={handleChange} 
                  required 
                  disabled={isEditMode}
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <input 
                  name="category" 
                  placeholder="e.g. Food, Electronics, Furniture" 
                  value={form.category} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity</label>
                  <input 
                    name="quantity" 
                    type="number" 
                    placeholder="0" 
                    value={form.quantity} 
                    onChange={handleChange} 
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Price ({systemSettings.currency}) *</label>
                  <input 
                    name="price" 
                    type="number" 
                    placeholder="0.00" 
                    value={form.price} 
                    onChange={handleChange} 
                    required 
                    min="0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Low Stock Alert Threshold</label>
                <input 
                  name="lowStockThreshold" 
                  type="number" 
                  placeholder={systemSettings.lowStockThreshold}
                  value={form.lowStockThreshold} 
                  onChange={handleChange} 
                  min="1"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  {isEditMode ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {selectedProductDetails && (
        <div className="modal-overlay" onClick={() => setSelectedProductDetails(null)}>
          <div className="modal-card detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Product Details</h3>
              <button className="close-modal-btn" onClick={() => setSelectedProductDetails(null)}>
                &times;
              </button>
            </div>
            
            <div className="details-body">
              <div className="details-header-info">
                <div>
                  <h4>{selectedProductDetails.name}</h4>
                  <span className="details-sku">SKU: {selectedProductDetails.sku}</span>
                </div>
              </div>

              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Category</span>
                  <span className="detail-value">{selectedProductDetails.category}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Storage Location</span>
                  <span className="detail-value">{getStorageLocation(selectedProductDetails.name, selectedProductDetails.category)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Stock Status</span>
                  <span className={`status-badge ${getStatus(selectedProductDetails) === "Low Stock" ? "status-low" : getStatus(selectedProductDetails) === "Out of Stock" ? "status-out" : getStatus(selectedProductDetails) === "Expired" ? "status-expired" : "status-good"}`}>
                    {getStatus(selectedProductDetails)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Current Quantity</span>
                  <span className="detail-value">{selectedProductDetails.quantity} {getUnit(selectedProductDetails.name, selectedProductDetails.category)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Unit Price</span>
                  <span className="detail-value">{systemSettings.currency}{selectedProductDetails.price}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Alert Threshold</span>
                  <span className="detail-value">Less than {selectedProductDetails.lowStockThreshold} units</span>
                </div>
                <div className="detail-item full-width">
                  <span className="detail-label">Last Updated</span>
                  <span className="detail-value">{formatLastUpdated(selectedProductDetails.updatedAt)}</span>
                </div>
                <div className="detail-item full-width">
                  <span className="detail-label">Product Created</span>
                  <span className="detail-value">{formatLastUpdated(selectedProductDetails.createdAt)}</span>
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setSelectedProductDetails(null)}>
                Close
              </button>
              <button 
                className="btn-submit" 
                onClick={(e) => {
                  openEditModal(selectedProductDetails, e);
                  setSelectedProductDetails(null);
                }}
              >
                Edit Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;