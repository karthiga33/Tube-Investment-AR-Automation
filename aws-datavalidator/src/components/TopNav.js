import React from 'react';
import { NavLink } from 'react-router-dom';
import './TopNav.css';

const TopNav = ({ userName, onLogout }) => {
  return (
    <header className="topnav">
      <nav className="topnav-links">
        <NavLink to="/"       className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>Documents</NavLink>
        <NavLink to="/status" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>Email</NavLink>
      </nav>
      <div className="topnav-brand">AR Automation</div>
      <div className="topnav-right">
        <span className="admin-tag">{userName}</span>
        <button className="btn-logout" onClick={onLogout}>Logout</button>
      </div>
    </header>
  );
};

export default TopNav;
