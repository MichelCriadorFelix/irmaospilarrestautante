import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginWithSocial: (providerName: 'google' | 'facebook') => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  resendVerification: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  loginWithSocial: async () => {},
  logout: () => {}, 
  updateUser: async () => {},
  resendVerification: async () => {},
  resetPassword: async () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync user from Firestore
  const syncUserFromFirestore = async (firebaseUser: FirebaseUser) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    let userData: User;
    if (userSnap.exists()) {
      userData = { ...userSnap.data(), uid: firebaseUser.uid, email: firebaseUser.email || '' } as User;
    } else {
      // Default to 'user' role unless email contains 'admin'
      const role = (firebaseUser.email || '').includes('admin') ? 'admin' : 'user';
      userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || 'Usuário',
        role,
        createdAt: Date.now()
      };
      await setDoc(userRef, userData);
    }

    // Only set user if email is verified (or if it's a social login that usually comes verified)
    // We'll pass the verification status through the User type
    const finalUser = { ...userData, emailVerified: firebaseUser.emailVerified };
    setUser(finalUser);
    return finalUser;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await syncUserFromFirestore(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      await syncUserFromFirestore(result.user);
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      const firebaseUser = result.user;
      
      // Save initial profile to Firestore
      const userData: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || email,
        name,
        role: email.includes('admin') ? 'admin' : 'user',
        createdAt: Date.now()
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), userData);

      // Send verification email
      await sendEmailVerification(firebaseUser);
      
      await syncUserFromFirestore(firebaseUser);
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = () => {
    signOut(auth).catch(err => console.error('Error signing out:', err));
  };

  const loginWithSocial = async (providerName: 'google' | 'facebook') => {
    setLoading(true);
    let provider;
    if (providerName === 'google') {
      provider = new GoogleAuthProvider();
    } else {
      provider = new FacebookAuthProvider();
    }

    try {
      const result = await signInWithPopup(auth, provider);
      await syncUserFromFirestore(result.user);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (data: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...data };
      setUser(updated);
      try {
        await setDoc(doc(db, 'users', user.uid), updated, { merge: true });
      } catch (err) {
        console.error('Failed to sync updated user:', err);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      loginWithEmail, 
      registerWithEmail, 
      loginWithSocial, 
      logout, 
      updateUser,
      resendVerification,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
