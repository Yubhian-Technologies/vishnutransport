const { db } = require('../config/firebase');

const getDashboardStats = async (req, res) => {
  try {
    // Use Firestore aggregate count() instead of fetching all docs
    const [
      totalApps, pendingCoord, pendingAcc, approved, rejL1, rejL2,
      totalRoutes, totalColleges, totalUsers,
      revenueSnap,
    ] = await Promise.all([
      db.collection('applications').count().get(),
      db.collection('applications').where('status', '==', 'pending_coordinator').count().get(),
      db.collection('applications').where('status', '==', 'pending_accounts').count().get(),
      db.collection('applications').where('status', '==', 'approved_final').count().get(),
      db.collection('applications').where('status', '==', 'rejected_l1').count().get(),
      db.collection('applications').where('status', '==', 'rejected_l2').count().get(),
      db.collection('busRoutes').count().get(),
      db.collection('colleges').count().get(),
      db.collection('users').count().get(),
      // For revenue sum, fetch only approved apps — select only fare field
      db.collection('applications').where('status', '==', 'approved_final').select('fare').get(),
    ]);

    const totalRevenue = revenueSnap.docs.reduce((sum, d) => sum + (Number(d.data().fare) || 0), 0);

    res.json({
      totalApplications: totalApps.data().count,
      pendingCoordinator: pendingCoord.data().count,
      pendingAccounts: pendingAcc.data().count,
      approvedFinal: approved.data().count,
      rejectedL1: rejL1.data().count,
      rejectedL2: rejL2.data().count,
      totalRoutes: totalRoutes.data().count,
      totalColleges: totalColleges.data().count,
      totalUsers: totalUsers.data().count,
      totalRevenue,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

const getRouteStats = async (req, res) => {
  try {
    // Fetch routes and ALL applications in 2 parallel reads instead of N+1
    const [routesSnap, appsSnap] = await Promise.all([
      db.collection('busRoutes').get(),
      db.collection('applications').select('routeId', 'status', 'fare').get(),
    ]);

    const routes = routesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Group apps by routeId in a single pass (O(n) instead of O(n*m))
    const appsByRoute = {};
    appsSnap.docs.forEach(doc => {
      const d = doc.data();
      if (!appsByRoute[d.routeId]) appsByRoute[d.routeId] = [];
      appsByRoute[d.routeId].push(d);
    });

    const stats = routes.map(route => {
      const apps = appsByRoute[route.id] || [];
      const confirmed = apps.filter(a => a.status === 'approved_final');
      return {
        routeId: route.id,
        routeName: route.routeName,
        seatCapacity: route.seatCapacity,
        occupiedSeats: confirmed.length,
        availableSeats: route.seatCapacity - confirmed.length,
        occupancyRate: route.seatCapacity > 0
          ? Math.round((confirmed.length / route.seatCapacity) * 100)
          : 0,
        revenue: confirmed.reduce((sum, a) => sum + (Number(a.fare) || 0), 0),
        totalApplications: apps.length,
        pendingApplications: apps.filter(a =>
          ['pending_coordinator', 'pending_accounts'].includes(a.status)
        ).length,
      };
    });

    res.json(stats);
  } catch (error) {
    console.error('Route stats error:', error);
    res.status(500).json({ error: 'Failed to fetch route statistics' });
  }
};

const getRevenueReport = async (req, res) => {
  try {
    const { collegeId, routeId } = req.query;
    let query = db.collection('applications').where('status', '==', 'approved_final');
    if (collegeId) query = query.where('collegeId', '==', collegeId);
    if (routeId) query = query.where('routeId', '==', routeId);

    const snapshot = await query.select('routeId', 'routeName', 'collegeId', 'college', 'fare').get();
    const apps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const byRoute = {};
    const byCollege = {};

    for (const app of apps) {
      if (!byRoute[app.routeId]) {
        byRoute[app.routeId] = { routeName: app.routeName, count: 0, revenue: 0 };
      }
      byRoute[app.routeId].count++;
      byRoute[app.routeId].revenue += Number(app.fare) || 0;

      if (!byCollege[app.collegeId]) {
        byCollege[app.collegeId] = { collegeName: app.college, count: 0, revenue: 0 };
      }
      byCollege[app.collegeId].count++;
      byCollege[app.collegeId].revenue += Number(app.fare) || 0;
    }

    res.json({
      totalRevenue: apps.reduce((sum, a) => sum + (Number(a.fare) || 0), 0),
      totalStudents: apps.length,
      byRoute: Object.entries(byRoute).map(([id, data]) => ({ id, ...data })),
      byCollege: Object.entries(byCollege).map(([id, data]) => ({ id, ...data })),
    });
  } catch (error) {
    console.error('Revenue report error:', error);
    res.status(500).json({ error: 'Failed to generate revenue report' });
  }
};

module.exports = { getDashboardStats, getRouteStats, getRevenueReport };
