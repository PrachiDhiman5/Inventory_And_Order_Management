import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header>
      <div>
        <Link to="/" style={{ fontSize: '20px', letterSpacing: '0.5px' }}>
          🧪 <strong>AasaMedChem</strong> Inventory
        </Link>
      </div>
      <div>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span>Welcome, <strong>{user.name}</strong> ({user.role})</span>
            <button onClick={handleLogout} className="btn btn-danger" style={{ padding: '5px 12px', fontSize: '12px' }}>
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '15px' }}>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
