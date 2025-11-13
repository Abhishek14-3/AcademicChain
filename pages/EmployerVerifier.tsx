import React, { useState, ChangeEvent, useEffect } from 'react';
import type { VerifiableCredential } from '../types';
import { verifyVCSignature, canonicalizeVC, computeCredentialHash } from '../utils/crypto';
import { isRevoked, getController } from '../services/contract';

// For TypeScript to recognize the library loaded from CDN
declare const Html5QrcodeScanner: any;

type VerificationStatus = 'idle' | 'verifying' | 'valid' | 'invalid' | 'revoked' | 'error';

interface VerificationStep {
  name: string;
  status: 'pending' | 'success' | 'failure' | 'warning';
  message: string;
}

const EmployerVerifier: React.FC = () => {
  const [vcInput, setVcInput] = useState('');
  const [vc, setVc] = useState<VerifiableCredential | null>(null);
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [steps, setSteps] = useState<VerificationStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    let scanner: any;
    if (isScannerOpen) {
      scanner = new Html5QrcodeScanner(
        "qr-reader-container-employer",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
        },
        false // verbose
      );

      const onScanSuccess = (decodedText: string) => {
        handleVcInputChange(decodedText);
        setIsScannerOpen(false);
      };

      const onScanFailure = (error: string) => {
        // This callback is called frequently, so we'll ignore errors to let the user keep trying.
      };

      scanner.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scanner && scanner.getState() !== 1 /* NOT_STARTED */) {
        scanner.clear().catch((error: any) => {
          console.error("Failed to clear html5-qrcode-scanner.", error);
        });
      }
    };
  }, [isScannerOpen]);

  const resetState = () => {
    setStatus('idle');
    setSteps([]);
    setVc(null);
  }

  const handleVcInputChange = (text: string) => {
    setVcInput(text);
    resetState();
  };

  const handleFileImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === 'string') {
          handleVcInputChange(content);
        }
      };
      reader.readAsText(file);
    }
  };
  
  const runVerification = async () => {
    setIsLoading(true);
    setStatus('verifying');
    let parsedVc: VerifiableCredential;
    try {
        parsedVc = JSON.parse(vcInput);
        setVc(parsedVc);
    } catch (e) {
        setStatus('error');
        setSteps([{ name: "Parse JSON", status: 'failure', message: "Input is not valid JSON." }]);
        setIsLoading(false);
        return;
    }

    const verificationSteps: VerificationStep[] = [];
    
    // Step 1: Verify Signature
    const sigVerification = verifyVCSignature(parsedVc);
    verificationSteps.push({
      name: "Cryptographic Signature",
      status: sigVerification.valid ? 'success' : 'failure',
      message: sigVerification.reason,
    });
    setSteps([...verificationSteps]);

    if (!sigVerification.valid) {
      setStatus('invalid');
      setIsLoading(false);
      return;
    }

    // Step 2: Check On-Chain Controller
    let controllerCheckStep: VerificationStep = { name: "Issuer DID Control", status: 'pending', message: 'Checking if issuer controls DID on-chain...'};
    verificationSteps.push(controllerCheckStep);
    setSteps([...verificationSteps]);
    
    try {
        const onChainController = await getController(parsedVc.issuer);
        const signerAddress = sigVerification.recoveredAddress;
        if (onChainController.toLowerCase() === signerAddress?.toLowerCase()) {
            controllerCheckStep.status = 'success';
            controllerCheckStep.message = `On-chain controller (${onChainController}) matches the credential signer.`;
        } else {
            controllerCheckStep.status = 'warning'; // Warning, not failure, as DID might not be registered for demo
            controllerCheckStep.message = `On-chain controller (${onChainController}) does not match signer (${signerAddress}). Credential may be valid but issuer DID is not registered or controller has changed.`;
        }
    } catch(e) {
        controllerCheckStep.status = 'warning';
        controllerCheckStep.message = 'Could not verify issuer DID controller on-chain. The DID may not be registered.';
    }
    setSteps([...verificationSteps]);
    
    // Step 3: Check Revocation Status
    let revocationStep: VerificationStep = { name: "Revocation Status", status: 'pending', message: 'Checking on-chain revocation list...'};
    verificationSteps.push(revocationStep);
    setSteps([...verificationSteps]);
    
    try {
        const { proof, ...vcWithoutProof } = parsedVc;
        const canonicalVC = canonicalizeVC(vcWithoutProof);
        const hash = computeCredentialHash(canonicalVC);
        const revoked = await isRevoked(hash);

        if (revoked) {
            revocationStep.status = 'failure';
            revocationStep.message = 'This credential has been revoked by the issuer.';
            setSteps([...verificationSteps]);
            setStatus('revoked');
            setIsLoading(false);
            return;
        } else {
            revocationStep.status = 'success';
            revocationStep.message = 'Credential is not on the revocation list.';
        }
    } catch (e) {
        revocationStep.status = 'warning';
        revocationStep.message = `Could not check revocation status: ${(e as Error).message}`;
    }

    setSteps([...verificationSteps]);
    setStatus('valid');
    setIsLoading(false);
  };

  const getStatusPill = () => {
    switch (status) {
      case 'valid': return <span className="px-3 py-1 text-sm font-bold text-white bg-green-600 rounded-full">VALID</span>;
      case 'invalid': return <span className="px-3 py-1 text-sm font-bold text-white bg-red-600 rounded-full">INVALID SIGNATURE</span>;
      case 'revoked': return <span className="px-3 py-1 text-sm font-bold text-white bg-yellow-600 rounded-full">REVOKED</span>;
      case 'error': return <span className="px-3 py-1 text-sm font-bold text-white bg-red-700 rounded-full">ERROR</span>;
      case 'verifying': return <span className="px-3 py-1 text-sm font-bold text-white bg-blue-600 rounded-full animate-pulse">VERIFYING...</span>;
      default: return <span className="px-3 py-1 text-sm font-bold text-gray-800 bg-gray-400 rounded-full">Awaiting Verification</span>;
    }
  };
  
  const getStepIcon = (status: VerificationStep['status']) => {
    switch (status) {
      case 'success': return <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'failure': return <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'warning': return <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
      default: return <svg className="w-6 h-6 text-blue-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v3m0 12v3m9-9h-3m-12 0H3m16.5-6.5L19 8m-14 8l-1.5 1.5M19 16l1.5 1.5M5 8l-1.5-1.5"/></svg>;
    }
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-indigo-400">Employer Verifier</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg space-y-4">
          <h3 className="text-xl font-semibold">Credential Input</h3>
          <textarea 
            className="w-full h-64 bg-gray-700 border border-gray-600 rounded-md p-3 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
            placeholder="Paste Verifiable Credential JSON here..."
            value={vcInput}
            onChange={e => handleVcInputChange(e.target.value)}
          />
          <div className="flex items-center space-x-4">
            <button onClick={runVerification} disabled={isLoading || !vcInput} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {isLoading ? 'Verifying...' : 'Verify Credential'}
            </button>
            <label className="bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700 transition-colors cursor-pointer">
              Upload File
              <input type="file" accept=".json" onChange={handleFileImport} className="hidden"/>
            </label>
            <button onClick={() => setIsScannerOpen(true)} className="bg-cyan-600 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-700 transition-colors">
              Scan QR Code
            </button>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Verification Result</h3>
            {getStatusPill()}
          </div>
          
          <div className="pt-2">
            {steps.length > 0 ? (
              <ul className="space-y-4">
                {steps.map((step, index) => (
                  <li key={index} className="relative flex items-start space-x-4">
                    {/* Vertical line for the timeline effect */}
                    {index < steps.length - 1 && (
                      <div className="absolute left-3 top-7 -bottom-5 w-0.5 bg-gray-600" aria-hidden="true"></div>
                    )}
                    <div className="flex-shrink-0 z-10 bg-gray-800 p-1 rounded-full">
                      {getStepIcon(step.status)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-200">{step.name}</p>
                      <p className="text-sm text-gray-400">{step.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    <p>Verification steps will appear here.</p>
                </div>
            )}
          </div>

          {status === 'valid' && vc && (
            <div className="pt-4 border-t border-gray-700">
                <h4 className="text-lg font-semibold mb-2">Credential Details</h4>
                <div className="bg-gray-900/50 p-4 rounded-md space-y-2 text-sm">
                    <p><strong>Degree:</strong> {vc.credentialSubject.degree.name}</p>
                    <p><strong>Major:</strong> {vc.credentialSubject.degree.major}</p>
                    <p><strong>University:</strong> {vc.credentialSubject.university}</p>
                    <p><strong>Issued To:</strong> <span className="font-mono text-xs">{vc.credentialSubject.id}</span></p>
                </div>
            </div>
          )}
        </div>
      </div>
      {isScannerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-2xl w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold mb-4 text-center">Scan Credential QR Code</h3>
            <div id="qr-reader-container-employer" className="w-full rounded-lg overflow-hidden border border-gray-700"></div>
            <button
              onClick={() => setIsScannerOpen(false)}
              className="mt-4 w-full bg-red-600 text-white font-bold py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerVerifier;
