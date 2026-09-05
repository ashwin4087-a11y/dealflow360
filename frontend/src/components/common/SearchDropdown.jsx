import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Search, X } from "lucide-react";
import { quotationApi } from "../../api/quotationApi";
import { customerApi } from "../../api/customerApi";
import { productApi } from "../../api/productApi";
import "./SearchDropdown.css";

export default function SearchDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState({ quotations: [], customers: [], products: [], deals: [] });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Load all searchable data
  const fetchSearchData = async () => {
    try {
      setLoading(true);
      const [quotationsRes, customersRes, productsRes] = await Promise.all([
        quotationApi.getQuotations().catch(() => ({ success: false, data: [] })),
        customerApi.getCustomers().catch(() => ({ success: false, data: [] })),
        productApi.getProducts().catch(() => ({ success: false, data: [] })),
      ]);

      return {
        quotations: quotationsRes.success ? quotationsRes.data : [],
        customers: customersRes.success ? customersRes.data : [],
        products: productsRes.success ? productsRes.data : [],
      };
    } catch (err) {
      console.error("Failed to fetch search data:", err);
      return { quotations: [], customers: [], products: [] };
    } finally {
      setLoading(false);
    }
  };

  // Perform search across all data
  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults({ quotations: [], customers: [], products: [], deals: [] });
      setSelectedIndex(-1);
      return;
    }

    const data = await fetchSearchData();
    const lowerQuery = searchQuery.toLowerCase();

    // Filter based on role
    let filteredQuotations = data.quotations;
    let filteredCustomers = data.customers;
    let filteredProducts = data.products;
    let filteredDeals = [];

    // Customer role: only show own data
    if (user?.role === "CUSTOMER") {
      const customerId = user?.id;
      filteredQuotations = data.quotations.filter(q => q.customerId === customerId);
      filteredCustomers = data.customers.filter(c => c.id === customerId);
      filteredProducts = [];
      filteredDeals = [];
    } else {
      // Sales/Manager: can see all
      filteredProducts = data.products;
      // Deals with stage information
      filteredDeals = data.quotations.filter(q => q.dealStage || q.stage);
    }

    // Search across fields - handle various field name variations
    const searchResults = {
      quotations: filteredQuotations.filter(q => {
        const qNum = (q.quotationNumber || q.reference || q.id || "").toString().toLowerCase();
        const qCust = (q.customerName || q.customer || "").toString().toLowerCase();
        return qNum.includes(lowerQuery) || qCust.includes(lowerQuery);
      }).slice(0, 5),
      
      customers: filteredCustomers.filter(c => {
        const cName = (c.name || c.customerName || "").toString().toLowerCase();
        const cInd = (c.industry || "").toString().toLowerCase();
        return cName.includes(lowerQuery) || cInd.includes(lowerQuery);
      }).slice(0, 5),
      
      products: filteredProducts.filter(p => {
        const pName = (p.name || p.productName || "").toString().toLowerCase();
        const pSku = (p.sku || p.productCode || "").toString().toLowerCase();
        return pName.includes(lowerQuery) || pSku.includes(lowerQuery);
      }).slice(0, 5),
      
      deals: filteredDeals.filter(d => {
        const dNum = (d.quotationNumber || d.reference || d.id || "").toString().toLowerCase();
        const dCust = (d.customerName || d.customer || "").toString().toLowerCase();
        return dNum.includes(lowerQuery) || dCust.includes(lowerQuery);
      }).slice(0, 3),
    };

    setResults(searchResults);
    setSelectedIndex(-1);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (value.trim()) {
      setIsOpen(true);
      performSearch(value);
    } else {
      setIsOpen(false);
      setResults({ quotations: [], customers: [], products: [], deals: [] });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) return;

    const allResults = [
      ...results.quotations.map(r => ({ ...r, type: "quotation" })),
      ...results.customers.map(r => ({ ...r, type: "customer" })),
      ...results.products.map(r => ({ ...r, type: "product" })),
      ...results.deals.map(r => ({ ...r, type: "deal" })),
    ];

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < allResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && allResults[selectedIndex]) {
          handleResultClick(allResults[selectedIndex]);
        } else if (allResults.length > 0) {
          handleResultClick(allResults[0]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setQuery("");
        setResults({ quotations: [], customers: [], products: [], deals: [] });
        break;
      default:
        break;
    }
  };

  // Handle result click - navigate to relevant page
  const handleResultClick = (result) => {
    let targetPath = "/sales/dashboard";

    if (result.type === "quotation" || result.type === "deal") {
      // Navigate to quotation details page
      targetPath = `/sales/quotations/${result.id}`;
    } else if (result.type === "customer") {
      // Stay on customers page but could pass customer ID via state
      targetPath = `/sales/customers`;
    } else if (result.type === "product") {
      // For now, redirect to dashboard - products can be enhanced later
      targetPath = `/sales/dashboard`;
    }

    // Clear search and navigate
    setQuery("");
    setIsOpen(false);
    setResults({ quotations: [], customers: [], products: [], deals: [] });
    navigate(targetPath, { 
      state: { selectedId: result.id, selectedType: result.type } 
    });
  };

  // Clear search
  const handleClear = () => {
    setQuery("");
    setIsOpen(false);
    setResults({ quotations: [], customers: [], products: [], deals: [] });
    inputRef.current?.focus();
  };

  const totalResults =
    results.quotations.length +
    results.customers.length +
    results.products.length +
    results.deals.length;

  const hasResults = totalResults > 0;

  const getDisplayName = (item) => {
    return item.quotationNumber || item.reference || item.name || item.customerName || item.id || "Unknown";
  };

  const getSubtitle = (item, type) => {
    if (type === "quotation" || type === "deal") {
      return item.customerName || item.customer || "No customer";
    } else if (type === "customer") {
      return item.industry || "Enterprise";
    } else if (type === "product") {
      return item.sku || item.productCode || item.category || "Product";
    }
    return "";
  };

  return (
    <div className="search-dropdown-wrapper" ref={dropdownRef}>
      <label className="search-box search-input-container">
        <Search size={16} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search customers, quotations, products..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setIsOpen(true)}
          className="search-input"
        />
        {query && (
          <button
            className="search-clear-button"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </label>

      {isOpen && (
        <div className="search-dropdown">
          {loading && (
            <div className="search-dropdown-content">
              <div className="search-loading">Searching...</div>
            </div>
          )}

          {!loading && !hasResults && query.trim() && (
            <div className="search-dropdown-content">
              <div className="search-no-results">
                <p>No results found for "{query}"</p>
                <small>Try searching for a customer name, quotation number, or product</small>
              </div>
            </div>
          )}

          {!loading && hasResults && (
            <div className="search-dropdown-content">
              {results.quotations.length > 0 && (
                <div className="search-group">
                  <div className="search-group-title">Quotations</div>
                  {results.quotations.map((q, idx) => (
                    <button
                      key={q.id}
                      className={`search-result-item ${
                        selectedIndex === idx ? "selected" : ""
                      }`}
                      onClick={() => handleResultClick({ ...q, type: "quotation" })}
                    >
                      <span className="search-result-icon">📋</span>
                      <div className="search-result-content">
                        <div className="search-result-title">
                          {getDisplayName(q)}
                        </div>
                        <div className="search-result-subtitle">
                          {getSubtitle(q, "quotation")}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.customers.length > 0 && (
                <div className="search-group">
                  <div className="search-group-title">Customers</div>
                  {results.customers.map((c, idx) => {
                    const adjustedIdx = results.quotations.length + idx;
                    return (
                      <button
                        key={c.id}
                        className={`search-result-item ${
                          selectedIndex === adjustedIdx ? "selected" : ""
                        }`}
                        onClick={() => handleResultClick({ ...c, type: "customer" })}
                      >
                        <span className="search-result-icon">👤</span>
                        <div className="search-result-content">
                          <div className="search-result-title">
                            {getDisplayName(c)}
                          </div>
                          <div className="search-result-subtitle">
                            {getSubtitle(c, "customer")}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {results.products.length > 0 && (
                <div className="search-group">
                  <div className="search-group-title">Products</div>
                  {results.products.map((p, idx) => {
                    const adjustedIdx = results.quotations.length + results.customers.length + idx;
                    return (
                      <button
                        key={p.id}
                        className={`search-result-item ${
                          selectedIndex === adjustedIdx ? "selected" : ""
                        }`}
                        onClick={() => handleResultClick({ ...p, type: "product" })}
                      >
                        <span className="search-result-icon">📦</span>
                        <div className="search-result-content">
                          <div className="search-result-title">
                            {getDisplayName(p)}
                          </div>
                          <div className="search-result-subtitle">
                            {getSubtitle(p, "product")}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {results.deals.length > 0 && (
                <div className="search-group">
                  <div className="search-group-title">Deals</div>
                  {results.deals.map((d, idx) => {
                    const adjustedIdx =
                      results.quotations.length +
                      results.customers.length +
                      results.products.length +
                      idx;
                    return (
                      <button
                        key={d.id}
                        className={`search-result-item ${
                          selectedIndex === adjustedIdx ? "selected" : ""
                        }`}
                        onClick={() => handleResultClick({ ...d, type: "deal" })}
                      >
                        <span className="search-result-icon">💼</span>
                        <div className="search-result-content">
                          <div className="search-result-title">
                            {getDisplayName(d)}
                          </div>
                          <div className="search-result-subtitle">
                            {getSubtitle(d, "deal")}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
