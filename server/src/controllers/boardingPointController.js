const { db } = require('../config/firebase');

const getByRoute = async (req, res) => {
  try {
    const snapshot = await db.collection('boardingPoints')
      .where('routeId', '==', req.params.routeId)
      .get();
    const points = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    res.json(points);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch boarding points' });
  }
};

const create = async (req, res) => {
  try {
    const { routeId, name, location, order, timings, fare, partialFare } = req.body;
    if (!routeId || !name) return res.status(400).json({ error: 'routeId and name are required' });

    const routeDoc = await db.collection('busRoutes').doc(routeId).get();
    if (!routeDoc.exists) return res.status(404).json({ error: 'Route not found' });

    const data = {
      routeId,
      name,
      location: location || '',
      order: Number(order) || 0,
      timings: timings || '',
      fare: fare !== undefined && fare !== '' ? Number(fare) : null,
      partialFare: partialFare !== undefined && partialFare !== '' ? Number(partialFare) : null,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('boardingPoints').add(data);
    res.status(201).json({ id: docRef.id, ...data });
  } catch (error) {
    console.error('Create boarding point error:', error);
    res.status(500).json({ error: 'Failed to create boarding point' });
  }
};

const update = async (req, res) => {
  try {
    const { name, location, order, timings, fare, partialFare } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (location !== undefined) updates.location = location;
    if (order !== undefined) updates.order = Number(order);
    if (timings !== undefined) updates.timings = timings;
    if (fare !== undefined) updates.fare = fare !== '' ? Number(fare) : null;
    if (partialFare !== undefined) updates.partialFare = partialFare !== '' ? Number(partialFare) : null;

    await db.collection('boardingPoints').doc(req.params.id).update(updates);
    res.json({ message: 'Boarding point updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update boarding point' });
  }
};

const remove = async (req, res) => {
  try {
    await db.collection('boardingPoints').doc(req.params.id).delete();
    res.json({ message: 'Boarding point deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete boarding point' });
  }
};

module.exports = { getByRoute, create, update, remove };
