import React from "react";

const MainContent = ({ isCollapsed }) => {
  return (
    <div className={`main-content ${isCollapsed ? "collapsed" : ""}`}>
      <div className="header">
        <h1>Admin Dashboard</h1>
        <p className="pp">Welcome, Admin User</p>
      </div>

      <div className="dashboard-content">
        {/* Dashboard widgets, charts, statistics can go here */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>Total Personnel</h3>
            <p className="stat-number">156</p>
          </div>
          <div className="stat-card">
            <h3>Pending Requests</h3>
            <p className="stat-number">23</p>
          </div>
          <div className="stat-card">
            <h3>Active Cases</h3>
            <p className="stat-number">12</p>
          </div>
          <div className="stat-card">
            <h3>Inventory Items</h3>
            <p className="stat-number">1,245</p>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="recent-activity">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            <div className="activity-item">
              <span className="activity-time">10:30 AM</span>
              <span className="activity-text">
                New leave request from John Doe
              </span>
            </div>
            <div className="activity-item">
              <span className="activity-time">09:15 AM</span>
              <span className="activity-text">Inventory update completed</span>
            </div>
            <div className="activity-item">
              <span className="activity-time">Yesterday</span>
              <span className="activity-text">5 new personnel registered</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainContent;
