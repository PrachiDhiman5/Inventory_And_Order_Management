import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatINR, formatDecimal, calculateItemPrice, getConversionFactor } from '../utils/conversion';

const BuyerDashboard = () => {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Direct order state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderQty, setOrderQty] = useState('');
  const [orderUnit, setOrderUnit] = useState('kg');
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Pricing preview calculation helper
  const [pricingPreview, setPricingPreview] = useState({ factor: '0', totalPrice: '0' });

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  // Update calculation preview dynamically when qty, unit, or product changes
  useEffect(() => {
    if (selectedProduct && orderQty && !isNaN(orderQty)) {
      try {
        const factorDecimal = getConversionFactor(orderUnit, selectedProduct.baseUnit);
        const priceDecimal = calculateItemPrice(orderQty, orderUnit, selectedProduct.basePricePerUnit, selectedProduct.baseUnit);
        setPricingPreview({
          factor: factorDecimal.toFixed(5),
          totalPrice: priceDecimal.toFixed(5)
        });
      } catch (err) {
        setPricingPreview({ factor: '0', totalPrice: '0' });
      }
    } else {
      setPricingPreview({ factor: '0', totalPrice: '0' });
    }
  }, [orderQty, orderUnit, selectedProduct]);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data.data);
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data.data);
    } catch (err) {
      console.error('Error loading orders:', err);
    }
  };

  const handleSelectProduct = (p) => {
    setSelectedProduct(p);
    setOrderQty('');
    setMsg({ text: '', type: '' });

    // Set initial unit based on product dimension
    if (p.baseUnit === 'kg' || p.baseUnit === 'g') setOrderUnit('kg');
    else if (p.baseUnit === 'L' || p.baseUnit === 'mL') setOrderUnit('L');
    else setOrderUnit('items');
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setMsg({ text: '', type: '' });

    if (!selectedProduct || !orderQty || Number(orderQty) <= 0) {
      setMsg({ text: 'Please enter a valid quantity.', type: 'danger' });
      return;
    }

    try {
      const orderPayload = {
        items: [
          {
            productId: selectedProduct._id,
            orderedQuantity: orderQty,
            orderedUnit: orderUnit
          }
        ]
      };

      const res = await api.post('/orders', orderPayload);
      if (res.data.success) {
        setMsg({ text: 'Quotation request submitted successfully!', type: 'success' });
        setSelectedProduct(null);
        setOrderQty('');
        fetchOrders();
      }
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Quotation placement failed.', type: 'danger' });
    }
  };

  // Category and Search Filtering
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Extract unique categories for filter
  const categories = ['All', ...new Set(products.map(p => p.category))];

  return (
    <div className="container">
      <h1>Buyer Procurement Dashboard</h1>

      {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      <div className="grid">
        
        {/* --- LEFT SIDE: CATALOG BROWSING --- */}
        <div className="card">
          <h2>Browse Inventory</h2>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="Search product or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, padding: '8px' }}
            />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: '8px' }}>
              {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
          </div>

          {filteredProducts.length === 0 ? <p>No products match search criteria.</p> : (
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Base Price</th>
                  <th>Unit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr key={p._id}>
                    <td>
                      <strong>{p.name}</strong>
                      <div style={{ fontSize: '11px', color: '#7f8c8d' }}>SKU: {p.sku}</div>
                    </td>
                    <td><span className="badge badge-buyer">{p.category}</span></td>
                    <td>{formatINR(p.basePricePerUnit)}</td>
                    <td>{p.baseUnit}</td>
                    <td>
                      <button onClick={() => handleSelectProduct(p)} className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '12px' }}>
                        Configure Quote
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* --- RIGHT SIDE: UNIT ESTIMATION & PLACE ORDER --- */}
        <div className="card">
          <h2>Precision Quote Builder</h2>
          {!selectedProduct ? (
            <p style={{ color: '#7f8c8d', textAlign: 'center', marginTop: '30px' }}>
              Select a product from the catalog on the left to configure a quotation.
            </p>
          ) : (
            <form onSubmit={handlePlaceOrder}>
              <div style={{ padding: '10px', background: '#ebf5fb', borderRadius: '4px', marginBottom: '15px' }}>
                Selected: <strong>{selectedProduct.name}</strong><br />
                Base price: <strong>{formatINR(selectedProduct.basePricePerUnit)} / {selectedProduct.baseUnit}</strong>
              </div>

              <div className="form-group">
                <label>Order Unit (Flexible Choices)</label>
                {/* Dynamically allow units based on the product dimension */}
                {(selectedProduct.baseUnit === 'kg' || selectedProduct.baseUnit === 'g') && (
                  <select value={orderUnit} onChange={(e) => setOrderUnit(e.target.value)}>
                    <option value="kg">kg (kilograms)</option>
                    <option value="g">g (grams)</option>
                  </select>
                )}
                {(selectedProduct.baseUnit === 'L' || selectedProduct.baseUnit === 'mL') && (
                  <select value={orderUnit} onChange={(e) => setOrderUnit(e.target.value)}>
                    <option value="L">L (liters)</option>
                    <option value="mL">mL (milliliters)</option>
                  </select>
                )}
                {selectedProduct.baseUnit === 'items' && (
                  <select value={orderUnit} onChange={(e) => setOrderUnit(e.target.value)}>
                    <option value="items">items (count)</option>
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>Requested Quantity</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 250.5"
                  value={orderQty}
                  onChange={(e) => setOrderQty(e.target.value)}
                />
              </div>

              {/* REAL-TIME CALCULATION PREVIEW */}
              {orderQty && !isNaN(orderQty) && Number(orderQty) > 0 && (
                <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #ddd', margin: '15px 0' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Mathematical Audit Breakdown:</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6' }}>
                    <li>Selected Product Storage Base: <strong>{selectedProduct.baseUnit}</strong></li>
                    <li>Unit Conversion Factor: <strong>{pricingPreview.factor}</strong> (Multiplier to base unit)</li>
                    <li>Converted Qty in Base Unit: <strong>{formatDecimal(Number(orderQty) * Number(pricingPreview.factor))} {selectedProduct.baseUnit}</strong></li>
                    <li>Base Unit Price: <strong>{formatINR(selectedProduct.basePricePerUnit)}</strong></li>
                    <li style={{ fontSize: '15px', marginTop: '5px', color: '#27ae60' }}>
                      Exact Estimated Price: <strong>{formatINR(pricingPreview.totalPrice)} INR</strong>
                    </li>
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-success" style={{ flex: 1 }}>
                  Place Order Quotation
                </button>
                <button type="button" onClick={() => setSelectedProduct(null)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* --- BOTTOM SECTION: ORDER HISTORY --- */}
      <div className="card" style={{ marginTop: '25px' }}>
        <h2>My Submitted Order Quotations</h2>
        {orders.length === 0 ? <p>No quotations submitted yet.</p> : (
          <table>
            <thead>
              <tr>
                <th>Quote ID</th>
                <th>Requested Products</th>
                <th>Quantity Ordered</th>
                <th>Total Quote Price</th>
                <th>Quotation Status</th>
                <th>Submitted Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order._id}>
                  <td>#{order._id.substring(18)}</td>
                  <td>
                    {order.items.map((item, index) => (
                      <div key={index}><strong>{item.productName}</strong></div>
                    ))}
                  </td>
                  <td>
                    {order.items.map((item, index) => (
                      <div key={index}>
                        {formatDecimal(item.orderedQuantity)} {item.orderedUnit}
                      </div>
                    ))}
                  </td>
                  <td><strong>{formatINR(order.totalPrice)}</strong></td>
                  <td>
                    <span className={`badge badge-${order.status}`}>{order.status}</span>
                  </td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default BuyerDashboard;
