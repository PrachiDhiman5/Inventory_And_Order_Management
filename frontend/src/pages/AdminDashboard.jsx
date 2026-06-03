import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatINR, formatDecimal } from '../utils/conversion';

const AdminDashboard = () => {
  const [tab, setTab] = useState('orders'); // 'orders', 'products', 'users'
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sellers, setSellers] = useState([]);

  // Add/Edit Product form state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null); // If null we are creating
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [baseUnit, setBaseUnit] = useState('kg');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const uRes = await api.get('/auth/users');
      setUsers(uRes.data.data);
      setSellers(uRes.data.data.filter(u => u.role === 'seller'));

      const pRes = await api.get('/products');
      setProducts(pRes.data.data);

      const oRes = await api.get('/orders');
      setOrders(oRes.data.data);
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
    setSellerId(sellers[0]?._id || '');
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
    setSellerId(p.seller?._id || p.seller || '');
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
        stockQuantity: stock,
        sellerId
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
        <h1>Admin Operations Dashboard</h1>
        <div>
          <button onClick={() => setTab('orders')} className={`btn ${tab === 'orders' ? 'btn-primary' : 'btn-secondary'}`} style={{ marginRight: '10px' }}>
            Quotations
          </button>
          <button onClick={() => setTab('products')} className={`btn ${tab === 'products' ? 'btn-primary' : 'btn-secondary'}`} style={{ marginRight: '10px' }}>
            Products
          </button>
          <button onClick={() => setTab('users')} className={`btn ${tab === 'users' ? 'btn-primary' : 'btn-secondary'}`}>
            Users
          </button>
        </div>
      </div>

      {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {/* --- FORM SECTION --- */}
      {showForm && (
        <div className="card" style={{ border: '1px solid #3498db' }}>
          <h3>{editId ? 'Edit Product' : 'Add New Product'}</h3>
          <form onSubmit={handleSubmit} className="grid">
            <div className="form-group">
              <label>Assigned Seller Profile</label>
              <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} disabled={!!editId}>
                {sellers.map(s => <option key={s._id} value={s._id}>{s.name} ({s.profile?.companyName})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Product Name</label>
              <input type="text" required placeholder="e.g. Ethanol" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>SKU (Unique)</label>
              <input type="text" required placeholder="e.g. CHEM-ETH-01" value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input type="text" required placeholder="e.g. Solvents" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Base Unit</label>
              <select value={baseUnit} onChange={(e) => setBaseUnit(e.target.value)}>
                <option value="kg">kg (weight)</option>
                <option value="g">g (weight)</option>
                <option value="L">L (volume)</option>
                <option value="mL">mL (volume)</option>
                <option value="items">items (count)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Price (INR) / Base Unit</label>
              <input type="number" step="any" required placeholder="e.g. 350.56" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Initial Stock Qty</label>
              <input type="number" step="any" required placeholder="e.g. 500" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea placeholder="Product details..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" className="btn btn-success">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* --- TAB CONTENT: ORDERS --- */}
      {tab === 'orders' && (
        <div className="card">
          <h2>Incoming Quotation Requests (Conversions Audit)</h2>
          {orders.length === 0 ? <p>No quotations found.</p> : (
            <table>
              <thead>
                <tr>
                  <th>Quote ID</th>
                  <th>Buyer & Company</th>
                  <th>Order Items</th>
                  <th>Precision Calculation Breakdown</th>
                  <th>Total Cost</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
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
                            • Ordered: {qty} {originalUnit}<br />
                            • Conversion: {qty} × {factor} = {convertedQty} {baseUnit}<br />
                            • Math: {convertedQty} × {basePrice} = <strong>{calcPrice}</strong>
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

      {/* --- TAB CONTENT: PRODUCTS --- */}
      {tab === 'products' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2>Global Product Catalog</h2>
            {!showForm && <button onClick={handleOpenCreate} className="btn btn-primary">+ Add Product</button>}
          </div>
          {products.length === 0 ? <p>No products configured.</p> : (
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU / Category</th>
                  <th>Base Price</th>
                  <th>Stock Qty</th>
                  <th>Assigned Seller</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p._id}>
                    <td>
                      <strong>{p.name}</strong>
                      <div style={{ fontSize: '12px', color: '#7f8c8d' }}>{p.description}</div>
                    </td>
                    <td>{p.sku} <span className="badge badge-buyer">{p.category}</span></td>
                    <td>{formatINR(p.basePricePerUnit)} / {p.baseUnit}</td>
                    <td><strong>{formatDecimal(p.stockQuantity)}</strong> {p.baseUnit}</td>
                    <td>{p.seller?.name || 'Unknown'} ({p.seller?.profile?.companyName})</td>
                    <td>
                      <button onClick={() => handleOpenEdit(p)} className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '12px', marginRight: '5px' }}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(p._id)} className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* --- TAB CONTENT: USERS --- */}
      {tab === 'users' && (
        <div className="card">
          <h2>Registered Profiles Directory</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Company Name</th>
                <th>Phone</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td><strong>{u.name}</strong></td>
                  <td>{u.email}</td>
                  <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                  <td>{u.profile?.companyName || '—'}</td>
                  <td>{u.profile?.phone || '—'}</td>
                  <td>{u.profile?.address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
