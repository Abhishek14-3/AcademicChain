
import React from 'react';
import type { VerifiableCredential } from '../types';

interface CredentialCardProps {
  vc: VerifiableCredential;
  actions?: React.ReactNode;
}

const CredentialCard: React.FC<CredentialCardProps> = ({ vc, actions }) => {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-md p-6 hover:border-indigo-500 transition-all duration-200">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-indigo-400">{vc.credentialSubject.degree.name}</h3>
          <p className="text-gray-400">{vc.credentialSubject.degree.major}</p>
        </div>
        <span className="text-xs font-mono bg-indigo-900/50 text-indigo-300 px-2 py-1 rounded">
          {vc.credentialSubject.degree.type}
        </span>
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <p><span className="font-semibold text-gray-300">University:</span> {vc.credentialSubject.university}</p>
        <p><span className="font-semibold text-gray-300">Issued to:</span> <span className="font-mono text-xs break-all">{vc.credentialSubject.id}</span></p>
        <p><span className="font-semibold text-gray-300">Issued by:</span> <span className="font-mono text-xs break-all">{vc.issuer}</span></p>
        <p><span className="font-semibold text-gray-300">Date:</span> {new Date(vc.issuanceDate).toLocaleDateString()}</p>
        {vc.evidence && vc.evidence[0] && (
          <p>
            <span className="font-semibold text-gray-300">Evidence (Transcript):</span> 
            <a href={`#`} onClick={(e) => e.preventDefault()} className="ml-2 font-mono text-xs text-cyan-400 hover:underline break-all" title="This is a mock IPFS link">
              {vc.evidence[0].cid.substring(0, 20)}...
            </a>
          </p>
        )}
      </div>
      {actions && (
        <div className="mt-6 pt-4 border-t border-gray-700 flex items-center space-x-2">
          {actions}
        </div>
      )}
    </div>
  );
};

export default CredentialCard;
