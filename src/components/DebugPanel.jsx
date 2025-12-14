// components/DebugPanel.jsx
import React from 'react';
import { useAuth } from './AuthContext';

const DebugPanel = () => {
  const { user, isAuthenticated, loading } = useAuth();
  
  return (
    <div style={{
      position: 'fixed',
      bottom: 10,
      right: 10,
      background: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '400px',
      maxHeight: '300px',
      overflow: 'auto',
      border: '2px solid #4F46E5'
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#60A5FA' }}>🔍 Auth Debug Panel</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
        <div><strong>Loading:</strong></div>
        <div style={{ color: loading ? '#FBBF24' : '#34D399' }}>
          {loading ? '🔄 YES' : '✅ NO'}
        </div>
        
        <div><strong>Authenticated:</strong></div>
        <div style={{ color: isAuthenticated ? '#34D399' : '#F87171' }}>
          {isAuthenticated ? '✅ YES' : '❌ NO'}
        </div>
        
        <div><strong>User Role:</strong></div>
        <div style={{ 
          color: user?.role === 'recruitment' ? '#60A5FA' : 
                 user?.role === 'admin' ? '#A78BFA' : '#34D399' 
        }}>
          {user?.role || '❌ NONE'}
        </div>
        
        <div><strong>isRecruitment:</strong></div>
        <div style={{ color: user?.isRecruitment ? '#60A5FA' : '#9CA3AF' }}>
          {user?.isRecruitment ? '✅ TRUE' : '❌ FALSE'}
        </div>
        
        <div><strong>isAdmin:</strong></div>
        <div style={{ color: user?.isAdmin ? '#A78BFA' : '#9CA3AF' }}>
          {user?.isAdmin ? '✅ TRUE' : '❌ FALSE'}
        </div>
        
        <div><strong>Username:</strong></div>
        <div>{user?.username || '❌ NONE'}</div>
        
        <div><strong>LocalStorage:</strong></div>
        <div>
          {localStorage.getItem('currentUser') ? '✅ Has data' : '❌ Empty'}
        </div>
      </div>
      
      <hr style={{ margin: '10px 0', borderColor: '#4B5563' }} />
      
      <div>
        <strong>Current Path:</strong>
        <div style={{ color: '#9CA3AF', fontSize: '11px' }}>
          {window.location.pathname}
        </div>
      </div>
      
      <button 
        onClick={() => {
          console.log('Auth State:', { user, isAuthenticated, loading });
          console.log('LocalStorage currentUser:', localStorage.getItem('currentUser'));
        }}
        style={{
          marginTop: '10px',
          padding: '4px 8px',
          background: '#4F46E5',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '10px'
        }}
      >
        Log to Console
      </button>
    </div>
  );
};

export default DebugPanel;