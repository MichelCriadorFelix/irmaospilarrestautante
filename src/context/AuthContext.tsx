import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  GithubAuthProvider,
  signOut
} from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginMock: (role: 'admin' | 'user', email?: string, name?: string) => Promise<void>;
  loginWithSocial: (providerName: 'google' | 'facebook' | 'github') => Promise<void>;
  logoutMock: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  loginMock: async () => {}, 
  loginWithSocial: async () => {},
  logoutMock: () => {}, 
  updateUser: async () => {} 
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = localStorage.getItem('mockUser');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);

        try {
          // Fetch fresh user profile details from Firestore to keep data up to date
          const userDoc = await getDoc(doc(db, 'users', parsedUser.uid));
          if (userDoc.exists()) {
            const dbUser = userDoc.data() as User;
            const mergedUser = { ...parsedUser, ...dbUser };
            localStorage.setItem('mockUser', JSON.stringify(mergedUser));
            setUser(mergedUser);
          }
        } catch (err) {
          console.error('Failed to restore user from Firestore:', err);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const loginMock = async (role: 'admin' | 'user', emailInput?: string, nameInput?: string) => {
    setLoading(true);
    const email = emailInput || (role === 'admin' ? 'admin@teste.com' : 'user@teste.com');
    const name = nameInput || (role === 'admin' ? 'Admin Teste' : 'Usuário Teste');
    
    // Generate a deterministic slug for the user to separate multiple users cleanly
    const emailSlug = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const uid = `${role}_${emailSlug}`;

    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      let finalUser: User;
      if (userSnap.exists()) {
        finalUser = { ...userSnap.data(), uid, email, role } as User;
      } else {
        finalUser = {
          uid,
          email,
          name,
          role,
          createdAt: Date.now()
        };
        await setDoc(userRef, finalUser);
      }

      localStorage.setItem('mockUser', JSON.stringify(finalUser));
      setUser(finalUser);
    } catch (err) {
      console.error('Error logging in and fetching Firestore user:', err);
      // Safe local fallback
      const fallbackUser: User = {
        uid,
        email,
        name,
        role,
        createdAt: Date.now()
      };
      localStorage.setItem('mockUser', JSON.stringify(fallbackUser));
      setUser(fallbackUser);
    } finally {
      setLoading(false);
    }
  };

  const logoutMock = () => {
    localStorage.removeItem('mockUser');
    setUser(null);
    signOut(auth).catch(err => console.error('Error signing out of Firebase:', err));
  };

  const loginWithSocial = async (providerName: 'google' | 'facebook' | 'github') => {
    setLoading(true);
    let provider;
    if (providerName === 'google') {
      provider = new GoogleAuthProvider();
    } else if (providerName === 'facebook') {
      provider = new FacebookAuthProvider();
    } else {
      provider = new GithubAuthProvider();
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const uid = firebaseUser.uid;
      const email = firebaseUser.email || '';
      const name = firebaseUser.displayName || 'Usuário Social';

      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      let finalUser: User;
      if (userSnap.exists()) {
        finalUser = { ...userSnap.data(), uid, email } as User;
      } else {
        const role = email.includes('admin') ? 'admin' : 'user';
        finalUser = {
          uid,
          email,
          name,
          role,
          createdAt: Date.now()
        };
        await setDoc(userRef, finalUser);
      }

      localStorage.setItem('mockUser', JSON.stringify(finalUser));
      setUser(finalUser);
    } catch (err) {
      console.error(`Error logging in with ${providerName}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (data: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...data };
      localStorage.setItem('mockUser', JSON.stringify(updated));
      setUser(updated);

      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, updated, { merge: true });
      } catch (err) {
        console.error('Failed to sync updated user to Firestore:', err);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginMock, loginWithSocial, logoutMock, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
