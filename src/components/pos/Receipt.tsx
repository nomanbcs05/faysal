import { forwardRef, useState } from 'react';
import { format } from 'date-fns';
import { businessInfo } from '@/data/mockData';
import { CartItem, Customer } from '@/stores/cartStore';
import { useMultiTenant } from '@/hooks/useMultiTenant';

interface Order {
  orderNumber: string;
  items: CartItem[];
  customer: Customer | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  deliveryFee?: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'wallet';
  orderType?: 'dine_in' | 'take_away' | 'delivery';
  createdAt: Date;
  cashierName: string;
  serverName?: string | null;
  rider?: { name: string } | null;
  customerAddress?: string | null;
  tableId?: number | null;
}

interface ReceiptProps {
  order: Order;
}

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(({ order }, ref) => {
  const [logoError, setLogoError] = useState(false);
  const { restaurant } = useMultiTenant();

  const logoSrc = restaurant?.logo_url || `/logo.jpeg?v=${Date.now()}`;
  const name = restaurant?.name || businessInfo.name;
  const address = restaurant?.address || businessInfo.address;
  const city = restaurant?.city || businessInfo.city;
  const phone = restaurant?.phone || businessInfo.phone;
  const taxId = restaurant?.tax_id || businessInfo.taxId;
  const website = restaurant?.website || businessInfo.website;
  const receiptFooter =
    restaurant?.receipt_footer || 'Thank you for your visit! Come back soon!';
  const paymentMethodLabel = {
    cash: 'Cash',
    card: 'Card',
    wallet: 'Digital Wallet',
  };

  return (
    <div
      ref={ref}
      className="receipt-print bg-white text-black p-4 font-mono text-xs mx-auto"
      style={{ width: '80mm' }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        {!logoError ? (
          <img
            src={logoSrc}
            alt="Logo"
            className="max-w-[120px] mx-auto mb-1 object-contain"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="text-2xl mb-2">☕</div>
        )}
        <h1 className="text-lg font-bold">{name}</h1>
        <p>{address}</p>
        <p>{city}</p>
        {phone && <p>Tel: {phone}</p>}
        {taxId && <p>Tax ID: {taxId}</p>}
      </div>

      {/* Divider */}
      <div className="border-t-2 border-dashed border-black my-3" />

      {/* Order Info */}
      <div className="mb-3">
        <p><strong>Order:</strong> {order.orderNumber}</p>
        <p><strong>Type:</strong> {order.orderType?.replace('_', ' ').toUpperCase() || 'DINE IN'}</p>
        <p><strong>Date:</strong> {format(order.createdAt, 'yyyy-MM-dd HH:mm:ss')}</p>
        <p><strong>Cashier:</strong> {order.cashierName}</p>
        {order.serverName && (
          <p><strong>Server:</strong> {order.serverName.replace(/^\[.*?\]\s*/, '')}</p>
        )}
        {order.tableId && (
          <p><strong>Table:</strong> {order.tableId}</p>
        )}
        {order.orderType === 'delivery' && order.rider && (
          <p><strong>Rider:</strong> {order.rider.name}</p>
        )}
        {order.customer && (
          <p><strong>Customer:</strong> {order.customer.name}</p>
        )}
        {order.customerAddress && (
          <p className="mt-1">
            <strong>Address:</strong><br />
            <span className="uppercase text-[10px] break-words">{order.customerAddress}</span>
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-black my-3" />

      {/* Items */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left py-1">Item</th>
            <th className="text-center py-1">Qty</th>
            <th className="text-right py-1">Price</th>
            <th className="text-right py-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.product.id}>
              <td className="py-1 pr-2 max-w-[120px] truncate">
                {item.product.name}
              </td>
              <td className="text-center py-1">{item.quantity}x</td>
              <td className="text-right py-1">Rs {item.product.price.toLocaleString()}</td>
              <td className="text-right py-1">Rs {item.lineTotal.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Divider */}
      <div className="border-t border-dashed border-black my-3" />

      {/* Totals */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>Rs {order.subtotal.toLocaleString()}</span>
        </div>
        {order.discountAmount > 0 && (
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>-Rs {order.discountAmount.toLocaleString()}</span>
          </div>
        )}
        {order.deliveryFee && order.deliveryFee > 0 && (
          <div className="flex justify-between">
            <span>Delivery Fee:</span>
            <span>Rs {order.deliveryFee.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm border-t border-black pt-1 mt-1">
          <span>Total:</span>
          <span>Rs {order.total.toLocaleString()}</span>
        </div>
      </div>

      {/* Payment Info */}
      <div className="border-t border-dashed border-black my-3 pt-2">
        <p><strong>Payment:</strong> {paymentMethodLabel[order.paymentMethod]}</p>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-dashed border-black my-3" />

      <div className="text-center mt-4">
        <p className="font-bold">{receiptFooter}</p>
        {website && <p className="mt-2">{website}</p>}

        {/* QR Code placeholder */}
        <div className="mt-4 mx-auto w-20 h-20 border-2 border-black flex items-center justify-center">
          <span className="text-[8px] text-center">QR Code<br />Digital Receipt</span>
        </div>

        <p className="mt-4 font-bold">Genai Nawabshah contact 923342826675</p>
      </div>

      {/* End marker */}
      <div className="text-center mt-4">
        <p>================================</p>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';

export default Receipt;
