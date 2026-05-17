import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', roles: ['employee', 'manager', 'admin'], icon: '⬡' },
  { path: '/goals', label: 'My Goals', roles: ['employee', 'manager'], icon: '◎' },
  { path: '/team-goals', label: 'Team Goals', roles: ['manager', 'admin'], icon: '◉' },
  { path: '/checkins', label: 'Check-ins', roles: ['manager', 'admin'], icon: '◈' },
  { path: '/reports', label: 'Reports', roles: ['manager', 'admin'], icon: '▦' },
  { path: '/audit', label: 'Audit Log', roles: ['admin'], icon: '▣' },
  { path: '/admin', label: 'Admin', roles: ['admin'], icon: '◆' },
];

const ROLE_COLORS = { employee: '#1B4FD8', manager: '#7C3AED', admin: '#059669' };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => { logout(); navigate('/login'); };

  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(user?.role));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--gray-50)' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '260px' : '68px', flexShrink: 0,
        background: 'white', borderRight: '1px solid var(--gray-200)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s ease', overflow: 'hidden',
        position: 'sticky', top: 0, height: '100vh'
      }}>
        {/* Logo */}
        <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: '10px', minHeight: '64px' }}>
          <div style={{ width: 36, height: 36, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>G</div>
          {sidebarOpen && <div><div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-900)', lineHeight: 1.2 }}>GoalPortal</div><div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Performance Tracking</div></div>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.75rem 0.5rem', overflowY: 'auto' }}>
          {visibleNav.map(item => (
            <NavLink key={item.path} to={item.path} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 10px', borderRadius: 8, margin: '2px 0',
              textDecoration: 'none', transition: 'all 0.15s',
              background: isActive ? 'var(--primary-light)' : 'transparent',
              color: isActive ? 'var(--primary)' : 'var(--gray-600)',
              fontWeight: isActive ? 600 : 400, fontSize: 14,
            })}>
              <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--gray-100)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: 8, background: 'var(--gray-50)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: ROLE_COLORS[user?.role] || 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            {sidebarOpen && (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', textTransform: 'capitalize' }}>{user?.role}</div>
              </div>
            )}
            {sidebarOpen && (
              <button onClick={handleLogout} className="btn btn-ghost btn-sm btn-icon" title="Logout" style={{ color: 'var(--gray-400)', fontSize: 16 }}>⇥</button>
            )}
          </div>
          <button onClick={() => setSidebarOpen(p => !p)} style={{ width: '100%', marginTop: 6, padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-end' : 'center' }}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
