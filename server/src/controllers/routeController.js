const { db } = require('../config/firebase');

const getAllRoutes = async (req, res) => {
  try {
    let query = db.collection('busRoutes');

    if (req.query.collegeId) {
      query = query.where('collegeIds', 'array-contains', req.query.collegeId);
    } else {
      query = query.orderBy('routeName');
    }

    const snapshot = await query.get();
    const routes = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (a.routeName || '').localeCompare(b.routeName || ''));

    if (req.query.includeOccupancy === 'true') {
      const RELEASED = ['rejected_l1', 'rejected_l2'];
      for (const route of routes) {
        const apps = await db.collection('applications')
          .where('routeId', '==', route.id)
          .get();
        const held = apps.docs.filter(d => !RELEASED.includes(d.data().status)).length;
        route.occupiedSeats = held;
        route.availableSeats = route.seatCapacity - held;
      }
    }

    res.json(routes);
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
};

const getRoute = async (req, res) => {
  try {
    const doc = await db.collection('busRoutes').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Route not found' });

    const route = { id: doc.id, ...doc.data() };

    const RELEASED = ['rejected_l1', 'rejected_l2'];
    const apps = await db.collection('applications')
      .where('routeId', '==', req.params.id)
      .get();
    const held = apps.docs.filter(d => !RELEASED.includes(d.data().status)).length;
    route.occupiedSeats = held;
    route.availableSeats = route.seatCapacity - held;

    const bpSnapshot = await db.collection('boardingPoints')
      .where('routeId', '==', req.params.id)
      .get();
    route.boardingPoints = bpSnapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (route.inchargeId) {
      const inchargeDoc = await db.collection('users').doc(route.inchargeId).get();
      if (inchargeDoc.exists) {
        const u = inchargeDoc.data();
        route.inchargeName = u.name || '';
        route.inchargePhone = u.phone || '';
      }
    }

    res.json(route);
  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({ error: 'Failed to fetch route' });
  }
};

const createRoute = async (req, res) => {
  try {
    const {
      routeName, routeNumber, startPoint, endPoint,
      seatCapacity, fare, partialFare, collegeIds, busNumber, driverName, driverPhone, inchargeId, stops,
    } = req.body;

    if (!routeName || !seatCapacity || fare === undefined) {
      return res.status(400).json({ error: 'routeName, seatCapacity, and fare are required' });
    }

    if (inchargeId) {
      const existing = await db.collection('busRoutes').where('inchargeId', '==', inchargeId).limit(1).get();
      if (!existing.empty) {
        return res.status(409).json({ error: `This incharge is already assigned to route "${existing.docs[0].data().routeName}"` });
      }
    }

    const data = {
      routeName,
      routeNumber: routeNumber || '',
      startPoint: startPoint || '',
      endPoint: endPoint || '',
      seatCapacity: Number(seatCapacity),
      fare: Number(fare),
      partialFare: partialFare ? Number(partialFare) : null,
      collegeIds: collegeIds || [],
      busNumber: busNumber || '',
      driverName: driverName || '',
      driverPhone: driverPhone || '',
      inchargeId: inchargeId || null,
      stops: Array.isArray(stops) ? stops : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('busRoutes').add(data);
    res.status(201).json({ id: docRef.id, ...data });
  } catch (error) {
    console.error('Create route error:', error);
    res.status(500).json({ error: 'Failed to create route' });
  }
};

const updateRoute = async (req, res) => {
  try {
    const allowed = [
      'routeName', 'routeNumber', 'startPoint', 'endPoint',
      'seatCapacity', 'fare', 'partialFare', 'collegeIds',
      'busNumber', 'driverName', 'driverPhone', 'inchargeId', 'stops',
    ];
    const updates = { updatedAt: new Date().toISOString() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.inchargeId) {
      const existing = await db.collection('busRoutes').where('inchargeId', '==', updates.inchargeId).get();
      const conflict = existing.docs.find(d => d.id !== req.params.id);
      if (conflict) {
        return res.status(409).json({ error: `This incharge is already assigned to route "${conflict.data().routeName}"` });
      }
    }

    await db.collection('busRoutes').doc(req.params.id).update(updates);
    res.json({ message: 'Route updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update route' });
  }
};

const deleteRoute = async (req, res) => {
  try {
    const appsSnap = await db.collection('applications')
      .where('routeId', '==', req.params.id)
      .limit(1)
      .get();
    if (!appsSnap.empty) {
      return res.status(409).json({ error: 'Cannot delete route with existing applications' });
    }
    await db.collection('busRoutes').doc(req.params.id).delete();
    res.json({ message: 'Route deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete route' });
  }
};

const assignIncharge = async (req, res) => {
  try {
    const { inchargeId } = req.body;
    if (!inchargeId) return res.status(400).json({ error: 'inchargeId is required' });

    const userDoc = await db.collection('users').doc(inchargeId).get();
    if (!userDoc.exists || userDoc.data().role !== 'bus_incharge') {
      return res.status(400).json({ error: 'User is not a bus incharge' });
    }

    const existing = await db.collection('busRoutes').where('inchargeId', '==', inchargeId).get();
    const conflict = existing.docs.find(d => d.id !== req.params.id);
    if (conflict) {
      return res.status(409).json({ error: `This incharge is already assigned to route "${conflict.data().routeName}"` });
    }

    await db.collection('busRoutes').doc(req.params.id).update({
      inchargeId,
      updatedAt: new Date().toISOString(),
    });
    res.json({ message: 'Incharge assigned successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign incharge' });
  }
};

module.exports = { getAllRoutes, getRoute, createRoute, updateRoute, deleteRoute, assignIncharge };
