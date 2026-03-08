import { createContext, useContext, useState, ReactNode } from 'react';
import { ScentSnapshot } from './components/mockData';

interface UserSnapshotsContextType {
  userSnapshots: ScentSnapshot[];
  addSnapshot: (snapshot: Omit<ScentSnapshot, 'id'>) => void;
}

const UserSnapshotsContext = createContext<UserSnapshotsContextType | undefined>(undefined);

export function UserSnapshotsProvider({ children }: { children: ReactNode }) {
  const [userSnapshots, setUserSnapshots] = useState<ScentSnapshot[]>([]);

  const addSnapshot = (snapshot: Omit<ScentSnapshot, 'id'>) => {
    const newSnapshot: ScentSnapshot = {
      ...snapshot,
      id: `user-${Date.now()}`,
    };
    setUserSnapshots(prev => [newSnapshot, ...prev]);
  };

  return (
    <UserSnapshotsContext.Provider value={{ userSnapshots, addSnapshot }}>
      {children}
    </UserSnapshotsContext.Provider>
  );
}

export function useUserSnapshots() {
  const context = useContext(UserSnapshotsContext);
  if (!context) {
    throw new Error('useUserSnapshots must be used within UserSnapshotsProvider');
  }
  return context;
}
