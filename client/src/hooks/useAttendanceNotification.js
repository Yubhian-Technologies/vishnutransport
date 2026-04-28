import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export function useAttendanceNotification(currentUser, role) {
  const seenIds = useRef(new Set());
  const initialised = useRef(false);

  useEffect(() => {
    if (!currentUser?.uid || (role !== 'student' && role !== 'faculty')) return;

    const q = query(
      collection(db, 'attendance'),
      where('studentId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!initialised.current) {
        // Seed seen IDs on first load — don't notify for existing records
        snapshot.docs.forEach(d => seenIds.current.add(d.id));
        initialised.current = true;
        return;
      }

      snapshot.docChanges().forEach(change => {
        if (change.type === 'added' && !seenIds.current.has(change.doc.id)) {
          seenIds.current.add(change.doc.id);
          const data = change.doc.data();
          const period = data.period === 'morning' ? 'Morning' : 'Evening';
          const time = format(new Date(data.timestamp), 'hh:mm a');

          toast.success(
            `✅ Attendance marked!\n${period} session — ${time}`,
            {
              duration: 6000,
              style: {
                background: '#f0fdf4',
                border: '1px solid #86efac',
                color: '#166534',
                fontWeight: '600',
                fontSize: '14px',
                padding: '14px 18px',
                borderRadius: '12px',
              },
            }
          );
        }
      });
    });

    return () => {
      unsubscribe();
      initialised.current = false;
    };
  }, [currentUser?.uid, role]);
}
