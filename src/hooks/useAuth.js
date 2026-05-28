import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Listen to their profile in Realtime Database
        const profileRef = ref(db, `users/${firebaseUser.uid}/profile`);
        const unsubscribeProfile = onValue(profileRef, (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.val());
          } else {
            setProfile(null);
          }
          setLoading(false);
        });

        return () => unsubscribeProfile();
      } else {
        // If not logged in, auto sign-in anonymously
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Anonymous auth failed:", error);
          setLoading(false);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return { user, profile, loading };
}
