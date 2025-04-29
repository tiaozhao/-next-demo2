import { loggerService } from '~/lib/logger';

/**
 * Clean JSON response by removing markdown and non-JSON content
 * @param text Original response text
 * @returns Cleaned JSON string
 */
export function cleanJsonResponse(text: string): string {
  if (!text) {
    throw new Error('Input text is required');
  }

  try {
    // Remove markdown code block markers and clean whitespace
    let cleaned = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();

    // Extract JSON object if found
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const possibleJson = jsonMatch[0];
      JSON.parse(possibleJson); // Validate JSON
      return possibleJson;
    }

    throw new Error('No valid JSON structure found in the response');
  } catch (error) {
    throw new Error(`Failed to clean JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create an empty address object
 */
export function createEmptyAddress(): any {
  return {
    firstName: null,
    lastName: null,
    name: null,
    company: null,
    address1: null,
    address2: null,
    city: null,
    province: null,
    zip: null,
    country: null,
    phone: null,
    countryCode: null,
    provinceCode: null
  };
}

/**
 * Parse an address from a string format
 * @param addressStr Address string
 * @returns Parsed address object
 */
export function parseAddressString(addressStr: string): any {
  if (typeof addressStr !== 'string') {
    return createEmptyAddress();
  }

  const address = createEmptyAddress();
  const lines = addressStr.split('\n');

  if (lines.length > 0) {
    address.name = lines[0].trim();

    if (lines.length > 1) {
      address.company = lines[1].trim();
    }

    if (lines.length > 2) {
      address.address1 = lines[2].trim();
    }

    if (lines.length > 3) {
      const cityStateZip = lines[3].trim().split(',');
      if (cityStateZip.length > 0) {
        address.city = cityStateZip[0].trim();
      }

      if (cityStateZip.length > 1) {
        const stateZip = cityStateZip[1].trim().split(' ');
        if (stateZip.length > 0) {
          address.province = stateZip[0].trim();
        }

        if (stateZip.length > 1) {
          address.zip = stateZip[1].trim();
        }
      }
    }
  }

  return address;
}

/**
 * Preprocess raw data to handle common field name variations
 * This normalizes field names before schema validation and transformation
 */
export function preprocessRawData(data: any, loggerClassName: string = 'ResponseParser'): any {
  const result = { ...data };

  // Handle field name variations

  // Date field variations
  if (!result.date && result.DATE) {
    result.date = result.DATE;
  } else if (!result.date && result.orderDate) {
    result.date = result.orderDate;
  }

  // Order number variations
  if (!result.orderNumber && result['Order #']) {
    result.orderNumber = result['Order #'];
  } else if (!result.orderNumber && result['Order Number']) {
    result.orderNumber = result['Order Number'];
  }

  // PO number variations
  if (!result.poNumber && result['PO #']) {
    result.poNumber = result['PO #'];
  } else if (!result.poNumber && result['Purchase Order Number']) {
    result.poNumber = result['Purchase Order Number'];
  } else if (!result.poNumber && result.PO) {
    result.poNumber = result.PO;
  }

  // Customer info variations
  if (!result.customerName && result.CUSTOMER) {
    result.customerName = result.CUSTOMER;
  } else if (!result.customerName && result.VENDOR) {
    result.customerName = result.VENDOR;
  } else if (!result.customerName && result.customer?.name) {
    result.customerName = result.customer.name;
  }

  if (!result.customerEmail && result.email) {
    result.customerEmail = result.email;
  }

  if (!result.customerPhone && result.phone) {
    result.customerPhone = result.phone;
  }

  // Handle billing address format variations
  if (!result.billingAddress && result['BILL TO']) {
    const billTo = result['BILL TO'];
    result.billingAddress = parseAddressString(billTo);
  }

  // Handle shipping address format variations
  if (!result.shippingAddress && result['SHIP TO']) {
    const shipTo = result['SHIP TO'];
    result.shippingAddress = parseAddressString(shipTo);
  }

  // Ensure address objects exist
  if (!result.billingAddress) {
    result.billingAddress = createEmptyAddress();
  }

  if (!result.shippingAddress) {
    result.shippingAddress = createEmptyAddress();
  }

  // Handle items array variations
  if (!result.items) {
    if (Array.isArray(result.ITEMS) && result.ITEMS.length > 0) {
      result.items = result.ITEMS.map((item: any) => {
        const partNumber = item.partNumber || item.customerPartNumber || null;
        const itemSku = item.sku || item.SKU || null;

        // If we have a customerPartNumber but no SKU, use customerPartNumber as SKU
        const finalSku = (!itemSku && partNumber) ? partNumber : itemSku;

        return {
          customerPartNumber: partNumber,
          sku: finalSku,
          name: item.description || item.name || item.DESCRIPTION || 'Unknown Item',
          quantity: Number(item.quantity || item.QUANTITY || 1),
          price: Number(item.price || item.unitPrice || item.PRICE || 0),
          taxable: item.taxable ?? null
        };
      });
    } else if (Array.isArray(result.lineItems) && result.lineItems.length > 0) {
      result.items = result.lineItems.map((item: any) => {
        const partNumber = item.partNumber || item.customerPartNumber || null;
        const itemSku = item.sku || null;

        // If we have a customerPartNumber but no SKU, use customerPartNumber as SKU
        const finalSku = (!itemSku && partNumber) ? partNumber : itemSku;

        return {
          customerPartNumber: partNumber,
          sku: finalSku,
          name: item.description || item.name || 'Unknown Item',
          quantity: Number(item.quantity || 1),
          price: Number(item.unitPrice || item.price || 0),
          taxable: item.taxable ?? null
        };
      });
    } else {
      result.items = [];
    }
  } else {
    // Process existing items to ensure each item has a SKU
    result.items = result.items.map((item: any) => {
      if ((!item.sku || item.sku === '') && item.customerPartNumber) {
        return {
          ...item,
          sku: item.customerPartNumber
        };
      }
      return item;
    });
  }

  // Handle price variations
  if (result.totalPrice === undefined) {
    if (result.TOTAL !== undefined) {
      result.totalPrice = Number(result.TOTAL);
    } else if (result.total !== undefined) {
      result.totalPrice = Number(result.total);
    } else if (result.items && result.items.length > 0) {
      result.totalPrice = result.items.reduce(
        (sum: number, item: any) => sum + (Number(item.price) * Number(item.quantity)),
        0
      );
    } else {
      result.totalPrice = 0;
    }
  }

  if (result.subtotalPrice === undefined) {
    if (result.SUBTOTAL !== undefined) {
      result.subtotalPrice = Number(result.SUBTOTAL);
    } else if (result.subtotal !== undefined) {
      result.subtotalPrice = Number(result.subtotal);
    }
  }

  // Other field variations
  if (result.totalTax === undefined && result.tax !== undefined) {
    result.totalTax = Number(result.tax);
  } else if (result.totalTax === undefined && result.TAX !== undefined) {
    result.totalTax = Number(result.TAX);
  }

  if (result.totalShipping === undefined && result.shipping !== undefined) {
    result.totalShipping = Number(result.shipping);
  } else if (result.totalShipping === undefined && result.SHIPPING !== undefined) {
    result.totalShipping = Number(result.SHIPPING);
  }

  if (result.totalDiscounts === undefined && result.discount !== undefined) {
    result.totalDiscounts = Number(result.discount);
  } else if (result.totalDiscounts === undefined && result.DISCOUNT !== undefined) {
    result.totalDiscounts = Number(result.DISCOUNT);
  }

  if (!result.note && result.notes) {
    result.note = result.notes;
  }

  if (!result.shippingMethod && result['Shipping Method']) {
    result.shippingMethod = result['Shipping Method'];
  }

  if (!result.paymentTerms) {
    if (result.TERMS) {
      result.paymentTerms = result.TERMS;
    } else if (result['Payment Terms']) {
      result.paymentTerms = result['Payment Terms'];
    }
  }

  return result;
} 