import { forwardRef } from 'react';
import { format } from 'date-fns';
import { businessInfo } from '@/data/mockData';

interface Order {
  id: string;
  dailyId?: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  customers?: { name: string };
}

interface DailySummaryProps {
  orders: Order[];
  date: Date;
}

const DailySummary = forwardRef<HTMLDivElement, DailySummaryProps>(({ orders, date }, ref) => {
  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalSales = completedOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  
  const salesByMethod = completedOrders.reduce((acc, o) => {
    const method = o.payment_method || 'unknown';
    acc[method] = (acc[method] || 0) + Number(o.total_amount);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div 
      ref={ref} 
      className="receipt-print bg-white text-black p-6 font-mono text-xs mx-auto"
      style={{ width: '80mm' }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold">Daily Sales Summary</h1>
        <h2 className="text-md font-bold">{businessInfo.name}</h2>
        <p>Date: {format(date, 'yyyy-MM-dd')}</p>
        <p>Printed: {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
      </div>

      <div className="border-t-2 border-dashed border-black my-3" />

      {/* Summary Stats */}
      <div className="space-y-1 mb-4">
        <div className="flex justify-between">
          <span>Total Orders:</span>
          <span className="font-bold">{completedOrders.length}</span>
        </div>
        <div className="flex justify-between text-sm font-bold border-t border-black pt-1 mt-1">
          <span>Total Sales:</span>
          <span>Rs {totalSales.toLocaleString()}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-black my-3" />

      {/* Sales by Payment Method */}
      <div className="mb-4">
        <p className="font-bold mb-1 underline">Sales by Payment Method:</p>
        {Object.entries(salesByMethod).map(([method, amount]) => (
          <div key={method} className="flex justify-between capitalize">
            <span>{method}:</span>
            <span>Rs {amount.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-black my-3" />

      {/* Order List */}
      <div className="mb-4">
        <p className="font-bold mb-1 underline">Order Details:</p>
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left">#ID</th>
              <th className="text-left">Time</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {completedOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((order) => (
              <tr key={order.id}>
                <td className="py-1">#{order.dailyId || order.id.slice(0, 4)}</td>
                <td className="py-1">{format(new Date(order.created_at), 'HH:mm')}</td>
                <td className="text-right py-1">Rs {Number(order.total_amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-dashed border-black my-3" />
      
      <div className="text-center mt-4">
        <p className="font-bold">End of Day Report</p>
        <p className="mt-2">Genai Nawabshah contact 923342826675</p>
      </div>

      <div className="text-center mt-4">
        <p>================================</p>
      </div>
    </div>
  );
});

DailySummary.displayName = 'DailySummary';

export default DailySummary;
