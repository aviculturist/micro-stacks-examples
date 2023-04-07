import * as React from 'react';
import { atom } from 'jotai';
import type { Atom } from 'jotai';
import { atomFamily } from 'jotai/utils'
import { atomsWithQuery } from 'jotai-tanstack-query';

import { StacksNetwork } from 'micro-stacks/network';
import { networkAtom, stxAddressAtom, authState } from '@micro-stacks/jotai';
import { fetchReadOnlyFunction, fetchTransaction } from 'micro-stacks/api';
import { ChainID } from 'micro-stacks/common';
import deepEqual from 'fast-deep-equal/es6';

const currentCounterContractState = atom(get => {
    const network = get(networkAtom);
    const counterContract = 'SP2K10N8JB66VVK0A22KN8E451AR11ZAWJA40V3DQ.counter'
    return counterContract;
});

export const getCounterAtom = atom((get) => { 
  const network = get(networkAtom);
  const chain = network?.chainId === ChainID.Mainnet ? 'mainnet' : 'testnet';
  const session = get(authState);
  const userStxAddresses = get(stxAddressAtom);
  const cnryContract = get(currentCounterContractState);
  const [dataAtom, statusAtom] = atomsWithQuery(() => ({
    queryKey: ['get-counter'],
    queryFn: async () => {
    const [contractAddress, contractName] = cnryContract.split('.');
    const senderAddress = userStxAddresses ? userStxAddresses : contractAddress;
    try {
      const response = await fetchReadOnlyFunction<bigint>(
        {
          network,
          contractName,
          contractAddress,
          functionName: 'get-counter',
          functionArgs: [],
          senderAddress,
        },
        true
      );
      return Number(response);
    } catch (_e) {
      console.log(_e);
    }
    return 1;
    }
  }));
  return 0; 
});
