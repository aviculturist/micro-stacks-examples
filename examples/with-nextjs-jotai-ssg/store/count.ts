import { atom } from 'jotai';
import { atomFamilyWithQuery } from 'jotai-query-toolkit';
import { StacksNetwork } from 'micro-stacks/network';
import { networkAtom, stxAddressAtom, authState } from '@micro-stacks/jotai';
import { fetchReadOnlyFunction, fetchTransaction } from 'micro-stacks/api';
import { ChainID } from 'micro-stacks/common';

const currentCounterContractState = atom(get => {
    const network = get(networkAtom);
    const counterContract = 'SP2K10N8JB66VVK0A22KN8E451AR11ZAWJA40V3DQ.counter'
    return counterContract;
});

export const counterGetCounterAtom = atom<number>(get => {
    const network = get(networkAtom);
    const session = get(authState);
    return get(counterGetCounterQueryAtom([network, session]));
  });
  export const counterGetCounterQueryAtom = atomFamilyWithQuery<
    [StacksNetwork, any | null],
    number
  >(
    'counter-get-counter',
    async (get, param) => {
      const [network] = param;
      const chain = network?.chainId === ChainID.Mainnet ? 'mainnet' : 'testnet';
      const userStxAddresses = get(stxAddressAtom);
      const cnryContract = get(currentCounterContractState);
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
    },
    { refetchInterval: 120000 } // two minutes in milliseconds (5000 = 5 seconds)
  );