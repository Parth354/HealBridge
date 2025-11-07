import { useState } from 'react';
import { useToast } from '../context/ToastContext';

const APITester = () => {
  const [endpoint, setEndpoint] = useState('/doctor/appointments');
  const [method, setMethod] = useState('GET');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const testEndpoint = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };

      if (method !== 'GET' && body) {
        options.body = body;
      }

      const res = await fetch(`http://localhost:3000/api${endpoint}`, options);
      const data = await res.json();
      
      setResponse({
        status: res.status,
        data
      });

      if (res.ok) {
        showSuccess('API call successful');
      } else {
        showError(`API call failed: ${res.status}`);
      }
    } catch (error) {
      setResponse({
        status: 'Error',
        data: { error: error.message }
      });
      showError(`Request failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="font-bold mb-4">API Tester</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Method</label>
          <select 
            value={method} 
            onChange={(e) => setMethod(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Endpoint</label>
          <input
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="/doctor/appointments"
          />
        </div>

        {method !== 'GET' && (
          <div>
            <label className="block text-sm font-medium mb-1">Request Body (JSON)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-2 border rounded h-24"
              placeholder='{"key": "value"}'
            />
          </div>
        )}

        <button
          onClick={testEndpoint}
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-blue-400"
        >
          {loading ? 'Testing...' : 'Test API'}
        </button>

        {response && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Response:</h4>
            <div className="bg-gray-100 p-3 rounded">
              <div className="text-sm mb-2">Status: {response.status}</div>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(response.data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default APITester;