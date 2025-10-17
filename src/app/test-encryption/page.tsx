"use client";

import { useState } from "react";
import { encryptRSA } from "@/lib/crypto";

export default function TestEncryptionPage() {
  const [email, setEmail] = useState("phutawanchanrueng@gmail.com");
  const [firstName, setFirstName] = useState("Atomic");
  const [lastName, setLastName] = useState("cimotA");
  const [password, setPassword] = useState("A1234567");
  const [encryptedResult, setEncryptedResult] = useState("");
  const [error, setError] = useState("");

  const handleEncrypt = async () => {
    setError("");
    setEncryptedResult("");

    try {
      // Create payload matching Python script
      const payload = {
        email,
        firstName,
        lastName,
        password,
      };

      // Convert to JSON string
      const payloadStr = JSON.stringify(payload);

      // Encrypt using RSA
      const encrypted = await encryptRSA(payloadStr);

      // Format like Python output
      const result = JSON.stringify({ data: encrypted }, null, 2);
      setEncryptedResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Encryption failed");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(encryptedResult);
    alert("Copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">RSA Encryption Test</h1>
        <p className="text-gray-600 mb-8">
          This page tests RSA encryption to match your Python script.
          <br />
          Use this to verify the encryption works correctly with the backend.
        </p>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Input Data</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleEncrypt}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Encrypt
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-semibold mb-2">Error</h3>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {encryptedResult && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Encrypted Result</h2>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                Copy JSON
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm">{encryptedResult}</pre>
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">How to test:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Click &quot;Copy JSON&quot; button above</li>
                <li>Open Postman</li>
                <li>Create a POST request to: http://localhost:3030/auth/signUp</li>
                <li>Set Content-Type header to: application/json</li>
                <li>Paste the copied JSON into the request body</li>
                <li>Send the request</li>
                <li>Should get a successful response! ✅</li>
              </ol>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">Compare with Python:</h3>
              <p className="text-sm text-yellow-800 mb-2">
                Your Python script output should have the same structure as above.
              </p>
              <code className="text-xs bg-yellow-100 p-2 rounded block overflow-x-auto">
                python test.py
              </code>
              <p className="text-xs text-yellow-700 mt-2">
                Note: The encrypted data will be different each time due to OAEP padding randomness.
                But the format should match!
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">Expected JSON Payload (before encryption):</h3>
          <pre className="text-sm bg-white p-3 rounded overflow-x-auto">
{JSON.stringify(
  {
    email,
    firstName,
    lastName,
    password,
  },
  null,
  2
)}
          </pre>
        </div>
      </div>
    </div>
  );
}
