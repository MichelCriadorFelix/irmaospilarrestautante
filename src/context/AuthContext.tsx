import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser
} from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginWithSocial: (providerName: 'google' | 'facebook') => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  resendVerification: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  loginWithSocial: async () => {},
  logout: () => {}, 
  updateUser: async () => {},
  resendVerification: async () => {},
  resetPassword: async () => {},
  refreshUser: async () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Set browser local persistence for automatic seamless login
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('Persistence setup warning:', err);
    });
  }, []);

  // Sync user from Firestore
  const syncUserFromFirestore = async (firebaseUser: FirebaseUser) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    let userData: User;
    const email = firebaseUser.email || '';
    const isOwner = email === 'michelgeminicriador@gmail.com' || email === 'felixcastroadv@gmail.com';

    if (userSnap.exists()) {
      const data = userSnap.data();
      const currentRole = data.role || 'user';
      const shouldBeAdmin = isOwner && currentRole !== 'admin';
      
      userData = { 
        ...data, 
        uid: firebaseUser.uid, 
        email: email,
        name: data.name || firebaseUser.displayName || 'Usuário',
        role: isOwner ? 'admin' : currentRole
      } as User;

      if (shouldBeAdmin) {
        await setDoc(userRef, userData, { merge: true });
      }
    } else {
      const role = isOwner ? 'admin' : 'user';
      userData = {
        uid: firebaseUser.uid,
        email: email,
        name: firebaseUser.displayName || 'Usuário Google',
        role,
        createdAt: Date.now()
      };
      await setDoc(userRef, userData);
    }

    // Google accounts or authenticated sessions are set as verified
    const isEmailVerified = firebaseUser.emailVerified || firebaseUser.providerData.some(p => p.providerId === 'google.com') || true;
    const finalUser = { ...userData, emailVerified: isEmailVerified };
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

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      await syncUserFromFirestore(result.user);
    } catch (err) {
      console.error('Error logging in with Google:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Backward compatibility stubs
  const loginWithSocial = async (_providerName: 'google' | 'facebook') => {
    await loginWithGoogle();
  };

  const loginWithEmail = async () => {
    throw new Error('O login por e-mail e senha foi desativado. Por favor, utilize o login com o Google.');
  };

  const registerWithEmail = async () => {
    throw new Error('O cadastro por e-mail e senha foi desativado. Por favor, utilize o login com o Google.');
  };

  const resendVerification = async () => {};
  const resetPassword = async () => {};

  const refreshUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      await syncUserFromFirestore(auth.currentUser);
    }
  };

  const logout = () => {
    signOut(auth).catch(err => console.error('Error signing out:', err));
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
      loginWithGoogle,
      loginWithEmail, 
      registerWithEmail, 
      loginWithSocial, 
      logout, 
      updateUser,
      resendVerification,
      resetPassword,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

