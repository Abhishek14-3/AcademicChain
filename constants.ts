// NOTE: This is the default address for the first contract deployed in a local Hardhat node.
// Replace with your actual deployed contract address.
export const DID_REGISTRY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// ABI for the DIDRegistry.sol contract
export const DID_REGISTRY_ABI = [
    "function registerDID(string memory did, address controller, string memory metadataCID) external",
    "function anchorCredential(bytes32 hash) external",
    "function revokeCredential(bytes32 hash) external",
    "function isRevoked(bytes32 hash) view returns (bool)",
    "function getController(string memory did) view returns (address)"
];

// JSON-RPC endpoint for the local Hardhat node
export const LOCALHOST_RPC_URL = "http://localhost:8545/";