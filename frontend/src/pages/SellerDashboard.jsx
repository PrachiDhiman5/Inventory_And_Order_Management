import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { formatINR, formatDecimal } from '../utils/conversion';

const SellerDashboard = () => {
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState('products'); // 'products', 'orders'
  const [myProducts, setMyProducts] = useState([]);
  const [myOrders, setMyOrders] = useState([]);

  // Form states for Product CRUD (Sellers can manage their own products)
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [baseUnit, setBaseUnit] = useState('kg');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all products, then filter by current seller's ID
      const pRes = await api.get('/products');
      const filteredProducts = pRes.data.data.filter(p => {
        const sellerObjId = p.seller?._id || p.seller;
        return sellerObjId?.toString() === user._id.toString();
      });
      setMyProducts(filteredProducts);

      // Fetch all orders matching this seller's products
      const oRes = await api.get('/orders');
      setMyOrders(oRes.data.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleOpenCreate = () => {
    setEditId(null);
    setName('');
    setSku('');
    setDescription('');
    setCategory('General');
    setBaseUnit('kg');
    setPrice('');
    setStock('');
    setShowForm(true);
    setMsg({ text: '', type: '' });
  };

  const handleOpenEdit = (p) => {
    setEditId(p._id);
    setName(p.name);
    setSku(p.sku);
    setDescription(p.description || '');
    setCategory(p.category || 'General');
    setBaseUnit(p.baseUnit);
    setPrice(p.basePricePerUnit);
    setStock(p.stockQuantity);
    setShowForm(true);
    setMsg({ text: '', type: '' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      setMsg({ text: 'Product deleted successfully', type: 'success' });
      fetchData();
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Delete failed', type: 'danger' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ text: '', type: '' });
    try {
      const productPayload = {
        name, sku, description, category, baseUnit,
        basePricePerUnit: price,
        stockQuantity: stock
        // seller is automatically handled on the backend from req.user
      };

      if (editId) {
        await api.put(`/products/${editId}`, productPayload);
        setMsg({ text: 'Product updated successfully', type: 'success' });
      } else {
        await api.post('/products', productPayload);
        setMsg({ text: 'Product created successfully', type: 'success' });
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Save failed', type: 'danger' });
    }
  };

  const handleUpdateStatus = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update order status');
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Seller Inventory Panel</h1>
        <div>
          <button onClick={() => setTab('products')} className={`btn ${tab === 'products' ? 'btn-primary' : 'btn-secondary'}`} style={{ marginRight: '10px' }}>
            My Catalog
          </button>
          <button onClick={() => setTab('orders')} className={`btn ${tab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}>
            Received Orders
          </button>
        </div>
      </div>

      {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {/* --- FORM SECTION --- */}
      {showForm && (
        <div className="card" style={{ border: '1px solid #3498db' }}>
          <h3>{editId ? 'Edit Product Setup' : 'Add New Inventory Product'}</h3>
          <form onSubmit={handleSubmit} className="grid">
            <div className="form-group">
              <label>Product Name</label>
              <input type="text" required placeholder="e.g. Platinum Catalyst" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>SKU Code</label>
              <input type="text" required placeholder="e.g. PT-CAT-01" value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input type="text" required placeholder="e.g. Catalysts" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Storage Base Unit</label>
              <select value={baseUnit} onChange={(e) => setBaseUnit(e.target.value)}>
                <option value="kg">kg (weight)</option>
                <option value="g">g (weight)</option>
                <option value="L">L (volume)</option>
                <option value="mL">mL (volume)</option>
                <option value="items">items (count)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Base Price (INR) / Unit</label>
              <input type="number" step="any" required placeholder="e.g. 12500" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Warehouse Stock Level</label>
              <input type="number" step="any" required placeholder="e.g. 100" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Description</label>
              <textarea placeholder="Specify storage conditions..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" className="btn btn-success">Save Product</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* --- TAB CONTENT: MY PRODUCTS --- */}
      {tab === 'products' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2>My Warehouse Catalog</h2>
            {!showForm && <button onClick={handleOpenCreate} className="btn btn-primary">+ Add Product</button>}
          </div>

          {myProducts.length === 0 ? <p>No products in inventory. Please click Add Product to get started.</p> : (
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU / Category</th>
                  <th>Base Price</th>
                  <th>Current Stock</th>
                  <th>Status Alerts</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {myProducts.map(p => {
                  const qty = Number(p.stockQuantity);
                  const isLow = qty <= 10;
                  return (
                    <tr key={p._id}>
                      <td>
                        <strong>{p.name}</strong>
                        <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{p.description}</div>
                      </td>
                      <td>{p.sku} <span className="badge badge-buyer">{p.category}</span></td>
                      <td>{formatINR(p.basePricePerUnit)} / {p.baseUnit}</td>
                      <td><strong>{formatDecimal(p.stockQuantity)}</strong> {p.baseUnit}</td>
                      <td>
                        {isLow ? (
                          <span className="badge badge-rejected" style={{ fontSize: '11px' }}>Low Stock Alert!</span>
                        ) : (
                          <span className="badge badge-approved" style={{ fontSize: '11px' }}>Good Stock</span>
                        )}
                      </td>
                      <td>
                        <button onClick={() => handleOpenEdit(p)} className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '12px', marginRight: '5px' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(p._id)} className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* --- TAB CONTENT: MY RECEIVED ORDERS --- */}
      {tab === 'orders' && (
        <div className="card">
          <h2>Quotation Requests for My Products</h2>
          {myOrders.length === 0 ? <p>No quotation requests received.</p> : (
            <table>
              <thead>
                <tr>
                  <th>Quote ID</th>
                  <th>Buyer details</th>
                  <th>Requested Items</th>
                  <th>Precision Price Details</th>
                  <th>Total Quote Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {myOrders.map(order => (
                  <tr key={order._id}>
                    <td>#{order._id.substring(18)}</td>
                    <td>
                      <div><strong>{order.buyer?.name}</strong></div>
                      <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{order.buyer?.profile?.companyName}</div>
                    </td>
                    <td>
                      {order.items.map((item, index) => (
                        <div key={index}>
                          <strong>{item.productName}</strong>
                        </div>
                      ))}
                    </td>
                    <td>
                      {order.items.map((item, index) => {
                        const qty = formatDecimal(item.orderedQuantity);
                        const originalUnit = item.orderedUnit;
                        const factor = formatDecimal(item.conversionFactor);
                        const baseUnit = item.baseUnit;
                        const basePrice = formatINR(item.basePricePerUnit);
                        const calcPrice = formatINR(item.calculatedPrice);
                        const convertedQty = formatDecimal(Number(qty) * Number(factor));

                        return (
                          <div key={index} style={{ fontSize: '12px', padding: '6px', background: '#f8f9fa', borderRadius: '4px', marginBottom: '4px' }}>
                            • Quantity: {qty} {originalUnit}<br />
                            • Conversion: {qty} × {factor} = {convertedQty} {baseUnit}<br />
                            • Rate: {convertedQty} × {basePrice} = <strong>{calcPrice}</strong>
                          </div>
                        );
                      })}
                    </td>
                    <td><strong>{formatINR(order.totalPrice)}</strong></td>
                    <td><span className={`badge badge-${order.status}`}>{order.status}</span></td>
                    <td>
                      {order.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => handleUpdateOrderStatus(order._id, 'approved')} className="btn btn-success" style={{ padding: '4px 8px', fontSize: '12px' }}>
                            Approve
                          </button>
                          <button onClick={() => handleUpdateOrderStatus(order._id, 'rejected')} className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }}>
                            Reject
                          </button>
                        </div>
                      )}
                      {order.status === 'approved' && (
                        <button onClick={() => handleUpdateOrderStatus(order._id, 'delivered')} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>
                          Mark Delivered
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
