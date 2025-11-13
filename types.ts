
export interface CredentialSubject {
  id: string; // Student's DID
  degree: {
    type: string;
    name: string;
    major: string;
  };
  university: string;
}

export interface Proof {
  type: string;
  created: string;
  proofPurpose: string;
  verificationMethod: string;
  signature: string;
}

export interface Evidence {
  id: string;
  type: string[];
  name?: string;
  cid: string;
}

export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string; // University's DID
  issuanceDate: string;
  credentialSubject: CredentialSubject;
  evidence?: Evidence[];
  proof: Proof;
}
