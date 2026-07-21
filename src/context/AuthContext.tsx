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
  loginWithSocial: (providerName: 'google' | 'facebook') => Promise<void>;
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
        try {
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
        } catch (parseErr) {
          console.error('Failed to parse stored user from local storage:', parseErr);
          try {
            localStorage.removeItem('mockUser');
          } catch (storageErr) {
            console.error('Failed to remove corrupted item from localStorage:', storageErr);
          }
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
    } catch (err: any) {
      console.error(`Error logging in with ${providerName}:`, err);
      
      const errCode = err?.code || '';
      const errMsg = err?.message || '';
      const isDomainError = errCode === 'auth/unauthorized-domain' || errMsg.includes('unauthorized-domain') || errMsg.includes('auth/unauthorized-domain');
      
      if (isDomainError) {
        console.warn('Unauthorized domain detected. Logging in with a local fallback account to allow testing.');
        
        const mockEmail = `${providerName}-user@teste.com`;
        const mockName = providerName === 'google' ? 'Usuário Google (Teste)' : 'Usuário Facebook (Teste)';
        const uid = `social_fallback_${providerName}_temp`;
        
        const fallbackUser: User = {
          uid,
          email: mockEmail,
          name: mockName,
          role: 'user',
          createdAt: Date.now()
        };
        
        try {
          const userRef = doc(db, 'users', uid);
          await setDoc(userRef, fallbackUser, { merge: true });
        } catch (dbErr) {
          console.warn('Could not save fallback user to Firestore:', dbErr);
        }
        
        localStorage.setItem('mockUser', JSON.stringify(fallbackUser));
        setUser(fallbackUser);
        
        // Throw a specialized error object that we can catch in the UI to notify the user
        throw new Error(`UNAUTHORIZED_DOMAIN_FALLBACK|${providerName}`);
      }
      
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
