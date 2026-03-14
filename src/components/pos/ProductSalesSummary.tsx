import { forwardRef } from 'react';
import { format } from 'date-fns';

type OrderItem = {
  product_id?: string;
  product_name?: string;
  product_category?: string;
  quantity: number;
  price: number;
  products?: { name?: string; category?: string };
};

type OrderWithItems = {
  id: string;
  created_at: string;
  status?: string;
  order_items?: OrderItem[];
};

interface ProductSalesSummaryProps {
  date: Date;
  query: string;
  orders: OrderWithItems[];
}

const ProductSalesSummary = forwardRef<HTMLDivElement, ProductSalesSummaryProps>(
  ({ date, query, orders }, ref) => {
    const tokens = query
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const allItems: OrderItem[] = orders.flatMap((o) => o.order_items || []);

    const matchesQuery = (name?: string, category?: string) => {
      if (tokens.length === 0) return true;
      const n = (name || '').toLowerCase();
      const c = (category || '').toLowerCase();
      return tokens.some((t) => n.includes(t) || c.includes(t));
    };

    const aggregated = new Map<
      string,
      { name: string; quantity: number; revenue: number; cost: number; profit: number; stock: number; category: string }
    >();

    for (const item of allItems) {
      const name = item.product_name || item.products?.name || 'Unknown';
      const category = item.products?.category || item.product_category || 'Uncategorized';
      if (!matchesQuery(name, category)) continue;

      const key = name;
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const cost = Number((item as any).products?.cost) || 0;
      const stock = Number((item as any).products?.stock) || 0;

      const prev = aggregated.get(key) || {
        name: key,
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        stock: stock,
        category: category
      };

      prev.quantity += qty;
      prev.revenue += qty * price;
      prev.cost += qty * cost;
      prev.profit = prev.revenue - prev.cost;
      prev.stock = stock; // latest stock
      aggregated.set(key, prev);
    }

    const rows = Array.from(aggregated.values()).sort(
      (a, b) => b.quantity - a.quantity
    );

    // Group by category
    const categoriesMap = new Map<string, typeof rows>();
    for (const r of rows) {
      const list = categoriesMap.get(r.category) || [];
      list.push(r);
      categoriesMap.set(r.category, list);
    }

    const totalQty = rows.reduce((s, r) => s + r.quantity, 0);
    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
    const totalCost = rows.reduce((s, r) => s + r.cost, 0);
    const totalProfit = rows.reduce((s, r) => s + r.profit, 0);

    return (
      <div
        ref={ref}
        className="receipt-print bg-white text-black p-4 font-mono text-[10px] mx-auto"
        style={{ width: '80mm' }}
      >
        <div className="text-center mb-2">
          <h1 className="text-sm font-bold uppercase">Product Sales Monitoring</h1>
          <p className="font-bold">{format(date, 'EEEE, dd MMMM yyyy')}</p>
          {query?.trim() && (
            <p className="text-[9px]">Filter: {tokens.join(', ')}</p>
          )}
        </div>

        <div className="border-t border-black my-2" />

        {Array.from(categoriesMap.entries()).map(([category, items]) => (
          <div key={category} className="mb-4">
            <h2 className="font-bold border-b border-black mb-1 uppercase bg-gray-100 px-1">{category}</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b border-dotted border-black text-[9px]">
                  <th className="text-left w-24">Item</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Sales</th>
                  <th className="text-right">Profit</th>
                  <th className="text-right">Stk</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.name} className="border-b border-dotted border-gray-300">
                    <td className="py-1 break-words leading-tight">{r.name}</td>
                    <td className="py-1 text-right align-top">{r.quantity}</td>
                    <td className="py-1 text-right align-top">{r.revenue.toFixed(0)}</td>
                    <td className="py-1 text-right align-top">{r.profit.toFixed(0)}</td>
                    <td className="py-1 text-right align-top text-[8px]">{r.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div className="border-t-2 border-black mt-2 pt-1 font-bold space-y-1">
          <div className="flex justify-between">
            <span>TOTAL ITEMS SOLD:</span>
            <span>{totalQty}</span>
          </div>
          <div className="flex justify-between">
            <span>TOTAL REVENUE:</span>
            <span>Rs {totalRevenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-blue-800">
            <span>EST. TOTAL PROFIT:</span>
            <span>Rs {totalProfit.toLocaleString()}</span>
          </div>
        </div>

        <div className="text-center mt-4 border-t border-dotted border-black pt-2 text-[9px]">
          <p>GEN XCLOUD POS - MONITORING REPORT</p>
          <p>{format(new Date(), 'dd-MMM HH:mm:ss')}</p>
        </div>
      </div>
    );
  }
);

ProductSalesSummary.displayName = 'ProductSalesSummary';

export default ProductSalesSummary;

