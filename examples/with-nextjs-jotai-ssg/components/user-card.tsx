import { useAccount } from '@micro-stacks/react';
import { useState, useEffect } from 'react';
import { getCounterAtom } from '../store/count';
import { useAtom } from 'jotai';

export const UserCard = () => {
  const { stxAddress } = useAccount();
  const [hydrated, setHydrated] = useState(false);
  const count = useAtom(getCounterAtom);
  
	useEffect(() => {
		setHydrated(true);
	}, []);

  if (!hydrated) return <h2>No active session</h2>;
  if (!stxAddress) return <h2>No active session</h2>;
  return <><h2>{stxAddress}</h2><p>{count}</p></>;
};
