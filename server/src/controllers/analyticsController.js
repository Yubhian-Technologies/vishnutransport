const { db } = require('../config/firebase');

const getDashboardStats = async (req, res) => {
  try {
    const [appsSnap, routesSnap, collegesSnap, usersSnap] = await Promise.all([
      db.collection('applications').get(),
      db.collection('busRoutes').get(),
      db.collection('colleges').get(),
      db.collection('users').get(),
    ]);

    const apps = appsSnap.docs.map(d => d.data());

    const stats = {
      totalApplications: apps.length,
      pendingCoordinator: apps.filter(a => a.status === 'pending_coordinator').length,
      pendingAccounts: apps.filter(a => a.status === 'pending_accounts').length,
      approvedFinal: apps.filter(a => a.status === 'approved_final').length,
      rejectedL1: apps.filter(a => a.status === 'rejected_l1').length,
      rejectedL2: apps.filter(a => a.status === 'rejected_l2').length,
      totalRoutes: routesSnap.size,
      totalColleges: collegesSnap.size,
      totalUsers: usersSnap.size,
      totalRevenue: apps
        .filter(a => a.status === 'approved_final')
        .reduce((sum, a) => sum + (Number(a.fare) || 0), 0),
    };

    res.json(stats);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

const getRouteStats = async (req, res) => {
  try {
    const routesSnap = await db.collection('busRoutes').get();
    const routes = routesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const stats = await Promise.all(routes.map(async (route) => {
      const appsSnap = await db.collection('applications')
        .where('routeId', '==', route.id)
        .get();
      const apps = appsSnap.docs.map(d => d.data());
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
    }));

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

    const snapshot = await query.get();
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
