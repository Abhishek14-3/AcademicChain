import { ethers } from 'ethers';
import { DID_REGISTRY_ADDRESS, DID_REGISTRY_ABI, LOCALHOST_RPC_URL } from '../constants';

// A read-only provider for querying the blockchain.
const provider = new ethers.JsonRpcProvider(LOCALHOST_RPC_URL);

/**
 * Gets a read-only instance of the DIDRegistry contract.
 * @returns An ethers.Contract instance.
 */
export const getContract = () => {
  return new ethers.Contract(DID_REGISTRY_ADDRESS, DID_REGISTRY_ABI, provider);
};

/**
 * Gets a signer-connected instance of the DIDRegistry contract for transactions.
 * @param privateKey The private key of the account that will sign the transaction.
 * @returns An ethers.Contract instance connected to a signer.
 */
export const getContractWithSigner = (privateKey: string) => {
  const signer = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(DID_REGISTRY_ADDRESS, DID_REGISTRY_ABI, signer);
};

/**
 * Checks if a credential hash has been revoked on-chain.
 * @param credentialHash The Keccak-256 hash of the canonical credential.
 * @returns A promise that resolves to a boolean indicating revocation status.
 */
export const isRevoked = async (credentialHash: string): Promise<boolean> => {
  const contract = getContract();
  try {
    return await contract.isRevoked(credentialHash);
  } catch (error) {
    console.error("Failed to check revocation status:", error);
    // In a real app, handle this more gracefully (e.g., contract not found).
    // For the demo, we assume the contract is deployed and accessible.
    throw new Error("Could not connect to the smart contract to check revocation status. Is Hardhat node running?");
  }
};

/**
 * Retrieves the controller address for a given DID from the contract.
 * @param did The DID string (e.g., "did:ethr:0x...").
 * @returns A promise that resolves to the controller's Ethereum address.
 */
export const getController = async (did: string): Promise<string> => {
    const contract = getContract();
    try {
        return await contract.getController(did);
    } catch (error) {
        console.error("Failed to get controller:", error);
        throw new Error("Could not get controller from the smart contract.");
    }
};


/**
 * Anchors a credential hash on the blockchain.
 * @param credentialHash The hash to anchor.
 * @param privateKey The private key of the DID controller.
 * @returns The transaction response.
 */
export const anchorCredential = async (credentialHash: string, privateKey: string) => {
    const contract = getContractWithSigner(privateKey);
    try {
        const tx = await contract.anchorCredential(credentialHash);
        return await tx.wait();
    } catch (error) {
        console.error("Failed to anchor credential:", error);
        throw new Error("Failed to anchor credential on-chain.");
    }
};

/**
 * Registers a DID on the blockchain.
 * This is a preliminary step for an issuer.
 * @param did The DID to register.
 * @param controllerAddress The controlling address.
 * @param adminPrivateKey The private key of the account deploying/managing the contract (or controller itself).
 * @returns The transaction receipt.
 */
export const registerDID = async (did: string, controllerAddress: string, adminPrivateKey: string) => {
    const contract = getContractWithSigner(adminPrivateKey);
    try {
        const tx = await contract.registerDID(did, controllerAddress, ""); // metadataCID is optional
        return await tx.wait();
    } catch(error) {
        console.error("Failed to register DID:", error);
        throw new Error("Failed to register DID on-chain.");
    }
};