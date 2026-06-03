import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Landing = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="container" style={{ maxWidth: '800px', marginTop: '50px' }}>
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>🧪</div>
        <h1 style={{ fontSize: '36px', marginBottom: '10px', color: '#2c3e50' }}>
          Welcome to AasaMedChem Inventory
        </h1>
        <p style={{ fontSize: '18px', color: '#7f8c8d', marginBottom: '30px', lineHeight: '1.6' }}>
          A secure, high-precision inventory and quotation order management system designed for chemical catalog procurement.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '40px' }}>
          {user ? (
            <Link to={user.role === 'admin' ? '/admin' : user.role === 'seller' ? '/seller' : '/buyer'} className="btn btn-primary" style={{ padding: '12px 30px', fontSize: '16px' }}>
              Go to my Dashboard ({user.role})
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-primary" style={{ padding: '12px 30px', fontSize: '16px' }}>
                Login to Portal
              </Link>
              <Link to="/register" className="btn btn-secondary" style={{ padding: '12px 30px', fontSize: '16px' }}>
                Register Account
              </Link>
            </>
          )}
        </div>

        <hr style={{ margin: '40px 0', borderColor: '#eee' }} />

        {/* Key Platform Pillars */}
        <div className="grid" style={{ textAlign: 'left' }}>
          <div style={{ padding: '15px' }}>
            <h3>📐 Arbitrary-Precision Math</h3>
            <p style={{ color: '#7f8c8d', fontSize: '14px', lineHeight: '1.5' }}>
              Built-in unit conversion calculations (e.g. g ↔ kg, mL ↔ L) accurate to 5+ decimal places powered by <code>decimal.js</code>, avoiding standard float rounding errors.
            </p>
          </div>
          <div style={{ padding: '15px' }}>
            <h3>🛡️ Role-Based Access Guards</h3>
            <p style={{ color: '#7f8c8d', fontSize: '14px', lineHeight: '1.5' }}>
              Stateless token validation (JWT) segregates Admin, Seller, and Buyer portals, protecting inventory management interfaces and user profiles.
            </p>
          </div>
          <div style={{ padding: '15px' }}>
            <h3>📊 Live Calculators & Audits</h3>
            <p style={{ color: '#7f8c8d', fontSize: '14px', lineHeight: '1.5' }}>
              Buyers can place orders in flexible units (e.g. weight in grams even if product is base-stored in kilograms) with an audit breakdown visible to Admins.
            </p>
          </div>
          <div style={{ padding: '15px' }}>
            <h3>📦 Synchronized Stock Control</h3>
            <p style={{ color: '#7f8c8d', fontSize: '14px', lineHeight: '1.5' }}>
              Warehouse inventory deducts automatically in correct base units when quotation orders are approved, and restores if orders are canceled.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
