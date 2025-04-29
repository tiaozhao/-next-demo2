import { useState } from 'react';
import { type PurchaseOrderData } from '~/types/purchase-order';

const mockData: PurchaseOrderData = {
  email: 'jameszhou@aaxis.io',
  shippingAddress: {
    address1: '4230 Piggly Wiggly Drive',
    address2: ''
  },
  lineItems: [{
    sku: '240001',
    quantity: 1,
    price: 19.66
  }, {
    sku: '240002',
    quantity: 1,
    price: 13.95
  }]
};

export default function PurchaseOrderValidate() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const validatePurchaseOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/purchase-order/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shop-domain': 'b2b-accelerator.myshopify.com'
        },
        body: JSON.stringify(mockData)
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Validation failed:', error);
      setResult({ success: false, error: 'Validation request failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Purchase Order Validate</h1>
      <div className="mt-6">
        <button 
          onClick={validatePurchaseOrder}
          disabled={loading}
          className={`
            inline-flex items-center justify-center
            px-4 py-2 rounded-lg
            text-sm font-medium text-white
            bg-blue-600 hover:bg-blue-700
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-light0
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
          `}
        >
          {loading ? (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : null}
          {loading ? 'Validating...' : 'Validate Order'}
        </button>
      </div>
      
      {result && (
        <div className="mt-6">
          <h2 className="text-lg font-medium text-gray-900 mb-3">Validation Result:</h2>
          <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}