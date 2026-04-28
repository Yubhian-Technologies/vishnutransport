import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import api from '../utils/api';
import { profileAPI } from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (uid) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await fetchUserProfile(credential.user.uid);
    return credential.user;
  };

  const register = async (email, password, name, role = 'student', phone, collegeId, collegeName) => {
    await api.post('/auth/register', { email, password, name, role, phone, collegeId, collegeName });
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await fetchUserProfile(credential.user.uid);
    return credential.user;
  };

  const logout = () => signOut(auth);

  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  const refreshProfile = () => currentUser && fetchUserProfile(currentUser.uid);

  const updateProfile = async (data) => {
    await profileAPI.updateMe(data);
    await fetchUserProfile(currentUser.uid);
  };

  const role = userProfile?.role || null;
  const isStudent = role === 'student';
  const isFaculty = role === 'faculty';
  const isCoordinator = role === 'bus_coordinator';
  const isAccounts = role === 'accounts';
  const isIncharge = role === 'bus_incharge';
  const isSuperAdmin = role === 'super_admin';
  const isStaff = ['bus_coordinator', 'accounts', 'bus_incharge', 'super_admin'].includes(role);

  const value = {
    currentUser,
    userProfile,
    loading,
    role,
    isStudent,
    isFaculty,
    isCoordinator,
    isAccounts,
    isIncharge,
    isSuperAdmin,
    isStaff,
    login,
    register,
    logout,
    resetPassword,
    refreshProfile,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
