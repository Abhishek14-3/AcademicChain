import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { generateDid } from '../utils/crypto';
import type { VerifiableCredential } from '../types';
import CredentialCard from '../components/CredentialCard';

// For TypeScript to recognize the library loaded from CDN
declare const Html5QrcodeScanner: any;

interface Student {
  did: string;
  address: string;
  privateKey: string;
}

const StudentWallet: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [vcs, setVcs] = useState<VerifiableCredential[]>([]);
  const [vcInput, setVcInput] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    let scanner: any;
    if (isScannerOpen) {
      scanner = new Html5QrcodeScanner(
        "qr-reader-container",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
        },
        false // verbose
      );

      const onScanSuccess = (decodedText: string) => {
        setVcInput(decodedText);
        setIsScannerOpen(false);
      };

      const onScanFailure = (error: string) => {
        // This callback is called frequently, so we'll ignore errors to let the user keep trying.
      };

      scanner.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch((error: any) => {
          console.error("Failed to clear html5-qrcode-scanner.", error);
        });
      }
    };
  }, [isScannerOpen]);

  const loadStudentFromStorage = useCallback(() => {
    const storedStudent = localStorage.getItem('studentIdentity');
    if (storedStudent) {
      const parsedStudent = JSON.parse(storedStudent);
      setStudent(parsedStudent);
      loadVcsForDid(parsedStudent.did);
    } else {
      const newStudent = generateDid();
      localStorage.setItem('studentIdentity', JSON.stringify(newStudent));
      setStudent(newStudent);
    }
  }, []);

  const loadVcsForDid = (did: string) => {
    const storedVcs = localStorage.getItem(`vcs-${did}`);
    if (storedVcs) {
      setVcs(JSON.parse(storedVcs));
    }
  };
  
  useEffect(() => {
    loadStudentFromStorage();
  }, [loadStudentFromStorage]);

  const handleImportVC = () => {
    try {
      if (!student) throw new Error("Student identity not loaded.");
      const newVc: VerifiableCredential = JSON.parse(vcInput);
      // Basic validation
      if (!newVc.proof || !newVc.credentialSubject) {
        throw new Error("Invalid VC format.");
      }
      const updatedVcs = [...vcs, newVc];
      setVcs(updatedVcs);
      localStorage.setItem(`vcs-${student.did}`, JSON.stringify(updatedVcs));
      setVcInput('');
    } catch (error) {
      alert(`Failed to import VC: ${(error as Error).message}`);
    }
  };

  const handleFileImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === 'string') {
          setVcInput(content);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExportVC = (vc: VerifiableCredential) => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(vc, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `credential-${vc.id.slice(-8)}.json`;
    link.click();
  };

  const handleCreateNewIdentity = () => {
    const newStudent = generateDid();
    localStorage.setItem('studentIdentity', JSON.stringify(newStudent));
    setStudent(newStudent);
    setVcs([]); // Clear VCs for new identity
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-indigo-400">Student Wallet</h2>
      
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-3">Your Identity</h3>
        {student ? (
          <div className="space-y-2 text-sm bg-gray-900 p-4 rounded-md">
            <p><strong className="text-gray-400">DID:</strong> <span className="font-mono break-all">{student.did}</span></p>
            <p><strong className="text-gray-400">Private Key:</strong> <span className="font-mono text-xs break-all text-red-400">(for demo) {student.privateKey}</span></p>
             <button onClick={handleCreateNewIdentity} className="mt-2 px-3 py-1 text-xs font-medium text-white bg-gray-600 rounded hover:bg-gray-500 transition-colors">Generate New Identity</button>
          </div>
        ) : <p>Loading identity...</p>}
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-3">Import Credential</h3>
        <textarea 
          className="w-full h-32 bg-gray-700 border border-gray-600 rounded-md p-3 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          placeholder="Paste Verifiable Credential JSON here..."
          value={vcInput}
          onChange={e => setVcInput(e.target.value)}
        />
        <div className="mt-4 flex items-center space-x-4">
          <button onClick={handleImportVC} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors">
            Import from Text
          </button>
          <label className="bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700 transition-colors cursor-pointer">
            Import from File
            <input type="file" accept=".json" onChange={handleFileImport} className="hidden"/>
          </label>
          <button onClick={() => setIsScannerOpen(true)} className="bg-cyan-600 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-700 transition-colors">
            Scan QR Code
          </button>
        </div>
      </div>

      {isScannerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-2xl w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold mb-4 text-center">Scan Credential QR Code</h3>
            <div id="qr-reader-container" className="w-full rounded-lg overflow-hidden border border-gray-700"></div>
            <button
              onClick={() => setIsScannerOpen(false)}
              className="mt-4 w-full bg-red-600 text-white font-bold py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-2xl font-semibold">Your Credentials</h3>
        {vcs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vcs.map((vc, index) => (
              <CredentialCard 
                key={index} 
                vc={vc} 
                actions={
                  <button onClick={() => handleExportVC(vc)} className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-500 transition-colors">
                    Export JSON
                  </button>
                }
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-gray-800 rounded-lg">
            <p className="text-gray-400">You have no credentials yet.</p>
            <p className="text-gray-500 mt-2">Import a credential using the form above.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentWallet;