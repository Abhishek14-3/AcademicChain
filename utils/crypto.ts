import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import type { VerifiableCredential, Proof } from '../types';

/**
 * Generates a new Ethereum wallet and corresponding DID.
 * For demo purposes, this is an ephemeral wallet.
 * @returns An object with did, address, and privateKey.
 */
export const generateDid = () => {
  const wallet = ethers.Wallet.createRandom();
  return {
    did: `did:ethr:${wallet.address}`,
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
};

/**
 * Creates a canonical string representation of a VC, ready for hashing.
 * The `proof` field is removed, and keys are implicitly handled by JSON.stringify.
 * For production, a more robust canonicalization algorithm (like JCS) should be used.
 * @param vc The Verifiable Credential object.
 * @returns A stable, stringified version of the VC without the proof.
 */
export const canonicalizeVC = (vc: Omit<VerifiableCredential, 'proof'>): string => {
  return JSON.stringify(vc);
};

/**
 * Computes the Keccak-256 hash of the canonical VC string.
 * This hash is what gets signed and potentially anchored on-chain.
 * @param canonicalVCString The canonical string of the VC.
 * @returns The Keccak-256 hash as a hex string.
 */
export const computeCredentialHash = (canonicalVCString: string): string => {
  return ethers.keccak256(ethers.toUtf8Bytes(canonicalVCString));
};

/**
 * Signs a Verifiable Credential using a private key.
 * @param vc The full VC object (the proof field will be replaced).
 * @param privateKey The private key of the issuer.
 * @returns The Verifiable Credential with a complete proof object.
 */
export const signVC = async (vc: Omit<VerifiableCredential, 'proof'>, privateKey: string): Promise<VerifiableCredential> => {
  const wallet = new ethers.Wallet(privateKey);
  const canonicalVC = canonicalizeVC(vc);
  
  // Ethers' signMessage automatically hashes the message, so we sign the canonical string directly.
  const signature = await wallet.signMessage(ethers.toUtf8Bytes(canonicalVC));

  const proof: Proof = {
    type: "EcdsaSecp256k1Signature2019",
    created: new Date().toISOString(),
    proofPurpose: "assertionMethod",
    verificationMethod: `${vc.issuer}#keys-1`,
    signature: signature,
  };

  return { ...vc, proof };
};

/**
 * Verifies the signature of a Verifiable Credential.
 * @param vc The full Verifiable Credential object with its proof.
 * @returns An object indicating if the signature is valid and the recovered address.
 */
export const verifyVCSignature = (vc: VerifiableCredential): { valid: boolean; recoveredAddress?: string, reason: string } => {
  if (!vc.proof || !vc.proof.signature) {
    return { valid: false, reason: "VC is missing a proof or signature." };
  }
  
  try {
    const { proof, ...credentialWithoutProof } = vc;
    const canonicalVC = canonicalizeVC(credentialWithoutProof);
    
    const recoveredAddress = ethers.verifyMessage(ethers.toUtf8Bytes(canonicalVC), proof.signature);
    
    const issuerAddress = vc.issuer.split(':').pop();

    if (recoveredAddress.toLowerCase() === issuerAddress?.toLowerCase()) {
      return { valid: true, recoveredAddress, reason: "Signature is valid and matches issuer." };
    } else {
      return { valid: false, recoveredAddress, reason: `Signature is invalid. Expected issuer ${issuerAddress}, but got signer ${recoveredAddress}.` };
    }
  } catch (error) {
    console.error("Verification error:", error);
    return { valid: false, reason: `An error occurred during verification: ${(error as Error).message}` };
  }
};

/**
 * Helper to create a new Verifiable Credential object from form data.
 */
export const createCredential = (formData: {
    studentDid: string;
    degreeType: string;
    degreeName: string;
    major: string;
    universityName: string;
    issuerDid: string;
    evidenceCid?: string;
    evidenceName?: string;
}): Omit<VerifiableCredential, 'proof'> => {
  const issuanceDate = new Date().toISOString();
  
  const vc: Omit<VerifiableCredential, 'proof'> = {
    '@context': [
      "https://www.w3.org/2018/credentials/v1",
      "https://www.w3.org/2018/credentials/examples/v1"
    ],
    id: `urn:uuid:${uuidv4()}`,
    type: ["VerifiableCredential", "UniversityDegreeCredential"],
    issuer: formData.issuerDid,
    issuanceDate: issuanceDate,
    credentialSubject: {
      id: formData.studentDid,
      university: formData.universityName,
      degree: {
        type: formData.degreeType,
        name: formData.degreeName,
        major: formData.major,
      }
    },
  };

  if(formData.evidenceCid) {
    vc.evidence = [{
        id: `urn:uuid:${uuidv4()}`,
        type: ['Transcript'],
        name: formData.evidenceName,
        cid: formData.evidenceCid
    }];
  }

  return vc;
};