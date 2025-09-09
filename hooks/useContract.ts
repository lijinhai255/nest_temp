// import { Contract, Signer, Provider, JsonRpcProvider, Wallet } from 'ethers'
import { Contract, Signer } from 'ethers'
import counterAbi from '@/lib/abi/Counter.json'
import { useEthersProvider } from '@/hooks/useEthersProvider'
import { sepolia } from 'viem/chains'

const useCounterContract = (signer?: Signer) => {
  const provider = useEthersProvider({ chainId: sepolia.id })
  console.log(provider, 'p')
  return new Contract(counterAbi.address, counterAbi.abi, signer || provider)
}

export {
  useCounterContract
}