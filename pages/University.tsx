
import React, { useState, useEffect, useCallback } from 'react';
import { generateDid, createCredential, signVC, computeCredentialHash, canonicalizeVC } from '../utils/crypto';
import { uploadToIPFS } from '../utils/ipfs';
import { anchorCredential, registerDID } from '../services/contract';
import type { VerifiableCredential } from '../types';

interface Issuer {
  did: string;
  address: string;
  privateKey: string;
}

const UniversityPortal: React.FC = () => {
  const [issuer, setIssuer] = useState<Issuer | null>(null);
  const [studentDid, setStudentDid] = useState('');
  const [degreeType, setDegreeType] = useState('Bachelor of Science');
  const [degreeName, setDegreeName] = useState('Computer Science');
  const [major, setMajor] = useState('Artificial Intelligence');
  const [universityName, setUniversityName] = useState('University of Technology');
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [generatedVC, setGeneratedVC] = useState<VerifiableCredential | null>(null);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    handleGenerateIssuer();
  }, []);
  
  const handleGenerateIssuer = useCallback(() => {
      const newIssuer = generateDid();
      setIssuer(newIssuer);
      setStatus(`Generated new issuer DID: ${newIssuer.did}. Make sure to register it on-chain.`);
  }, []);

  const handleRegisterDID = async () => {
    if (!issuer) return;
    setIsLoading(true);
    setStatus('Registering issuer DID on-chain...');
    try {
      await registerDID(issuer.did, issuer.address, issuer.privateKey);
      setStatus('Issuer DID successfully registered on-chain!');
    } catch (error) {
      setStatus(`Error registering DID: ${(error as Error).message}`);
    }
    setIsLoading(false);
  };

  const handleIssueCredential = async () => {
    if (!issuer) {
      setStatus('Please generate an issuer DID first.');
      return;
    }
    setIsLoading(true);
    setStatus('Issuing credential...');
    setGeneratedVC(null);

    try {
      let evidenceCid: string | undefined;
      let evidenceName: string | undefined;
      if (transcriptFile) {
        setStatus('Uploading transcript to mock IPFS...');
        const result = await uploadToIPFS(transcriptFile);
        evidenceCid = result.cid;
        evidenceName = transcriptFile.name;
        setStatus('Transcript uploaded.');
      }

      setStatus('Creating and signing Verifiable Credential...');
      const unsignedVC = createCredential({
        studentDid,
        degreeType,
        degreeName,
        major,
        universityName,
        issuerDid: issuer.did,
        evidenceCid,
        evidenceName,
      });

      const signedVC = await signVC(unsignedVC, issuer.privateKey);
      setGeneratedVC(signedVC);
      setStatus('Credential issued successfully. You can now anchor it on-chain.');

    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`);
    }
    setIsLoading(false);
  };

  const handleAnchorCredential = async () => {
    if (!generatedVC || !issuer) {
      setStatus('Please issue a credential first.');
      return;
    }
    setIsLoading(true);
    setStatus('Anchoring credential on-chain...');
    try {
      const { proof, ...vcWithoutProof } = generatedVC;
      const canonicalVC = canonicalizeVC(vcWithoutProof);
      const hash = computeCredentialHash(canonicalVC);
      
      const receipt = await anchorCredential(hash, issuer.privateKey);
      setStatus(`Credential anchored successfully! Tx: ${receipt.transactionHash}`);

    } catch (error) {
      setStatus(`Error anchoring credential: ${(error as Error).message}`);
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-indigo-400">University Issuer Portal</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Issuer Info & Form */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-3">Issuer Identity</h3>
            {issuer ? (
              <div className="space-y-2 text-sm bg-gray-900 p-4 rounded-md">
                <p><strong className="text-gray-400">DID:</strong> <span className="font-mono break-all">{issuer.did}</span></p>
                <p><strong className="text-gray-400">Private Key:</strong> <span className="font-mono text-xs break-all text-red-400">(for demo) {issuer.privateKey}</span></p>
                <div className="flex space-x-2 pt-2">
                    <button onClick={handleGenerateIssuer} className="px-3 py-1 text-xs font-medium text-white bg-gray-600 rounded hover:bg-gray-500 transition-colors">New Issuer</button>
                    <button onClick={handleRegisterDID} disabled={isLoading} className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 transition-colors disabled:opacity-50">Register DID</button>
                </div>
              </div>
            ) : <p>Loading issuer...</p>}
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3">Issue New Credential</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Student's DID (e.g., did:ethr:0x...)" value={studentDid} onChange={e => setStudentDid(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"/>
              <input type="text" placeholder="University Name" value={universityName} onChange={e => setUniversityName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"/>
              <input type="text" placeholder="Degree Type (e.g., Bachelor of Science)" value={degreeType} onChange={e => setDegreeType(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"/>
              <input type="text" placeholder="Degree Name (e.g., Computer Science)" value={degreeName} onChange={e => setDegreeName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"/>
              <input type="text" placeholder="Major (e.g., Artificial Intelligence)" value={major} onChange={e => setMajor(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"/>
              <div>
                <label className="text-sm text-gray-400">Optional Transcript (PDF)</label>
                <input type="file" onChange={e => setTranscriptFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"/>
              </div>
              <button onClick={handleIssueCredential} disabled={isLoading || !studentDid} className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50">
                {isLoading ? 'Processing...' : 'Issue Credential'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Output & Status */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg space-y-4">
          <div>
            <h3 className="text-xl font-semibold mb-2">Status Log</h3>
            <div className="bg-gray-900 p-4 rounded-md text-sm text-gray-300 min-h-[60px] font-mono break-words">{status}</div>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Generated Verifiable Credential (JSON)</h3>
            <pre className="bg-gray-900 p-4 rounded-md text-xs text-cyan-300 overflow-auto max-h-96">
              {generatedVC ? JSON.stringify(generatedVC, null, 2) : 'Awaiting issuance...'}
            </pre>
            {generatedVC && (
              <button onClick={handleAnchorCredential} disabled={isLoading} className="mt-4 w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {isLoading ? 'Anchoring...' : 'Anchor Credential On-Chain'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UniversityPortal;
