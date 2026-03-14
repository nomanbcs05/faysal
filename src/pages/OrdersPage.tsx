import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isToday, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Search, Filter, Eye, Printer, RotateCcw, Calendar as CalendarIcon, Loader2, Trash2, PrinterCheck, UtensilsCrossed, MoreVertical } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';
import DailySummary from '@/components/pos/DailySummary';
import ProductSalesSummary from '@/components/pos/ProductSalesSummary';
import Receipt from '@/components/pos/Receipt';
import KOT from '@/components/pos/KOT';
import Bill from '@/components/pos/Bill';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from '@/components/ui/separator';
import { api } from '@/services/api';

const OrdersPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [date, setDate] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const queryClient = useQueryClient();
  const summaryRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const kotRef = useRef<HTMLDivElement>(null);
  const billRef = useRef<HTMLDivElement>(null);
  const productSummaryRef = useRef<HTMLDivElement>(null);
  const [printingOrder, setPrintingOrder] = useState<any>(null);
  const [printingKOTOrder, setPrintingKOTOrder] = useState<any>(null);
  const [billOrder, setBillOrder] = useState<any>(null);
  const [showBill, setShowBill] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productOrdersWithItems, setProductOrdersWithItems] = useState<any[]>([]);
  const [showProductSummaryModal, setShowProductSummaryModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: api.products.getAll,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: api.categories.getAll,
  });

  const { data: orders = [], isLoading, isError, error } = useQuery({
    queryKey: ['orders'],
    queryFn: api.orders.getAll,
  });

  const handlePrintSummary = useReactToPrint({
    contentRef: summaryRef,
    documentTitle: `Daily-Summary-${format(new Date(), 'yyyy-MM-dd')}`,
    onAfterPrint: () => {
      toast.success('Daily summary printed successfully');
    },
  });

  const handlePrintProductSummary = useReactToPrint({
    contentRef: productSummaryRef,
    documentTitle: `Product-Summary-${format(new Date(), 'yyyy-MM-dd')}`,
    onAfterPrint: () => {
      toast.success('Product sales summary printed successfully');
    },
  });

  const onPrintProductSummary = async (queryOverride?: string) => {
    try {
      const targetDate = date?.from ? date.from : new Date();
      const start = startOfDay(targetDate);
      const end = endOfDay(targetDate);
      const dayOrders = orders.filter((o: any) => {
        const d = new Date(o.created_at);
        return d >= start && d <= end && o.status === 'completed';
      });
      if (dayOrders.length === 0) {
        toast.info('No completed orders for the selected day');
        return;
      }
      const fullOrders = await Promise.all(
        dayOrders.map(async (o: any) => {
          try {
            return await api.orders.getByIdWithItems(o.id);
          } catch {
            return null;
          }
        })
      );
      const valid = fullOrders.filter(Boolean) as any[];
      if (valid.length === 0) {
        toast.error('Failed to load order items for summary');
        return;
      }
      if (typeof queryOverride === 'string') {
        setProductQuery(queryOverride);
      }
      setProductOrdersWithItems(valid);
      setTimeout(() => handlePrintProductSummary(), 100);
    } catch (e) {
      console.error(e);
      toast.error('Error preparing product summary');
    }
  };

  const handlePrintIndividual = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${printingOrder?.dailyId || printingOrder?.id?.slice(0, 8)}`,
    onAfterPrint: () => {
      setPrintingOrder(null);
      toast.success('Receipt printed successfully');
    },
  });

  const handlePrintKOT = useReactToPrint({
    contentRef: kotRef,
    documentTitle: `KOT-Duplicate-${printingKOTOrder?.dailyId || printingKOTOrder?.id?.slice(0, 8)}`,
    onAfterPrint: () => {
      setPrintingKOTOrder(null);
      toast.success('Duplicate KOT printed successfully');
    },
  });

  const handlePrintBill = useReactToPrint({
    contentRef: billRef,
    documentTitle: `Bill-${billOrder?.orderNumber || Date.now()}`,
    onAfterPrint: async () => {
      toast.success('Bill printed successfully');

      // If we have a bill order and it has an ID, update its status to completed
      if (billOrder?.id) {
        try {
          await api.orders.updateStatus(billOrder.id, 'completed');
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          toast.success('Order marked as completed');
        } catch (error) {
          console.error('Failed to update order status after printing:', error);
          toast.error('Failed to mark order as completed');
        }
      }

      setShowBill(false);
      setBillOrder(null);
    },
  });

  const onPrintIndividual = async (orderId: string) => {
    try {
      const fullOrder = await api.orders.getByIdWithItems(orderId);
      // Map database order to the format Receipt expects
      const dailyId = ordersWithDailyId.find(o => o.id === orderId)?.dailyId;

      const formattedOrder = {
        orderNumber: dailyId || fullOrder.id.slice(0, 8),
        items: fullOrder.order_items.map((item: any) => {
          const fallbackProduct = (products as any[])?.find?.((p: any) => p.id === item?.product_id) || {};
          const name = item.products?.name || item.product_name || fallbackProduct.name || 'Unknown Product';
          const price = item.price ?? item.products?.price ?? fallbackProduct.price ?? 0;
          const image = item.products?.image || fallbackProduct.image || '🍽️';
          const category = item.products?.category || item.product_category || fallbackProduct.category || 'General';
          return {
            product: {
              id: item.product_id || '',
              name,
              price,
              sku: '',
              cost: 0,
              stock: 0,
              category,
              image,
              description: ''
            },
            quantity: item.quantity,
            lineTotal: price * item.quantity
          };
        }),
        customer: fullOrder.customers ? {
          id: fullOrder.customer_id,
          name: fullOrder.customers.name,
          phone: fullOrder.customers.phone,
          email: fullOrder.customers.email
        } : null,
        subtotal: fullOrder.total_amount,
        taxAmount: 0,
        discountAmount: 0,
        total: fullOrder.total_amount,
        paymentMethod: fullOrder.payment_method,
        orderType: fullOrder.order_type,
        createdAt: new Date(fullOrder.created_at),
        cashierName: 'Cashier',
        serverName: ((fullOrder as any).server_name || '').replace(/^\[.*?\]\s*/, ''),
        tableId: (fullOrder as any).restaurant_tables?.table_number
      };

      setPrintingOrder(formattedOrder);
      // Wait for state update then print
      setTimeout(() => {
        handlePrintIndividual();
      }, 100);
    } catch (err) {
      console.error('Error printing order:', err);
      toast.error('Failed to load order details for printing');
    }
  };

  const onPrintKOTDuplicate = async (orderId: string) => {
    try {
      const fullOrder = await api.orders.getByIdWithItems(orderId);
      const dailyId = ordersWithDailyId.find(o => o.id === orderId)?.dailyId;

      const formattedOrder = {
        orderNumber: dailyId || fullOrder.id.slice(0, 8),
        items: fullOrder.order_items.map((item: any) => ({
          product: {
            id: item.product_id,
            name: item.products?.name || item.product_name || (products as any[])?.find?.((p: any) => p.id === item?.product_id)?.name || 'Item',
          },
          quantity: item.quantity,
        })),
        customer: fullOrder.customers ? {
          id: fullOrder.customer_id,
          name: fullOrder.customers.name,
        } : null,
        orderType: fullOrder.order_type,
        createdAt: new Date(fullOrder.created_at),
        cashierName: 'Cashier',
        serverName: ((fullOrder as any).server_name || '').replace(/^\[.*?\]\s*/, ''),
        tableId: (fullOrder as any).restaurant_tables?.table_number
      };

      setPrintingKOTOrder(formattedOrder);
      // Wait for state update then print
      setTimeout(() => {
        handlePrintKOT();
      }, 100);
    } catch (err) {
      console.error('Error printing duplicate KOT:', err);
      toast.error('Failed to load order details for KOT printing');
    }
  };

  const onPrintBill = async (orderId: string) => {
    try {
      const fullOrder = await api.orders.getByIdWithItems(orderId);
      const dailyId = ordersWithDailyId.find(o => o.id === orderId)?.dailyId;

      const billData = {
        id: fullOrder.id, // Include order ID for auto-save
        orderNumber: dailyId || fullOrder.id.slice(0, 8),
        items: fullOrder.order_items?.map((item: any) => ({
          product: {
            id: item.product_id,
            name: item.products?.name || item.product_name || (products as any[])?.find?.((p: any) => p.id === item?.product_id)?.name || 'Item',
            price: item.price,
            image: item.products?.image || (products as any[])?.find?.((p: any) => p.id === item?.product_id)?.image || '🍽️'
          },
          quantity: item.quantity,
          lineTotal: item.price * item.quantity
        })) || [],
        customer: fullOrder.customers ? {
          id: fullOrder.customer_id?.toString() || '',
          name: fullOrder.customers.name,
          phone: fullOrder.customers.phone || ''
        } : null,
        subtotal: fullOrder.total_amount,
        taxAmount: 0,
        discountAmount: 0,
        deliveryFee: 0,
        total: fullOrder.total_amount,
        paymentMethod: fullOrder.payment_method || 'cash',
        orderType: fullOrder.order_type,
        createdAt: new Date(fullOrder.created_at),
        cashierName: 'Cashier',
        serverName: ((fullOrder as any).server_name || '').replace(/^\[.*?\]\s*/, ''),
        tableId: (fullOrder as any).restaurant_tables?.table_number
      };

      setBillOrder(billData);
      setShowBill(true);
      setTimeout(() => {
        handlePrintBill();
      }, 100);
    } catch (err) {
      console.error('Error printing bill:', err);
      toast.error('Failed to load order details for bill printing');
    }
  };

  const onViewOrderDetails = async (orderId: string) => {
    try {
      const fullOrder = await api.orders.getByIdWithItems(orderId);
      const dailyId = ordersWithDailyId.find(o => o.id === orderId)?.dailyId;
      setViewingOrder({ ...fullOrder, dailyId });
      setShowViewModal(true);
    } catch (err) {
      console.error('Error viewing order details:', err);
      toast.error('Failed to load order details');
    }
  };

  const todayOrders = useMemo(() => {
    return orders.filter((order: any) => isToday(new Date(order.created_at)));
  }, [orders]);

  const deleteTodayMutation = useMutation({
    mutationFn: api.orders.deleteTodayOrders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success("Today's orders cleared successfully");
    },
    onError: (error) => {
      toast.error(`Failed to clear orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  const deleteAllMutation = useMutation({
    mutationFn: api.orders.deleteAllOrders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success("All order history cleared successfully");
    },
    onError: (error) => {
      toast.error(`Failed to clear history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  if (isError) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <p className="text-destructive font-medium">Failed to load orders</p>
            <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Calculate daily IDs for today's orders
  const ordersWithDailyId = useMemo(() => {
    // 1. Get all orders from today (already sorted in memo or sort here)
    const sortedTodayOrders = [...todayOrders].sort((a: any, b: any) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // 2. Create a map of ID -> Daily Index (1-based)
    const dailyIdMap = new Map();
    sortedTodayOrders.forEach((order: any, index: number) => {
      dailyIdMap.set(order.id, (index + 1).toString().padStart(2, '0'));
    });

    // 3. Return orders with dailyId attached
    return orders.map((order: any) => ({
      ...order,
      dailyId: dailyIdMap.get(order.id)
    }));
  }, [orders, todayOrders]);

  const filteredOrders = ordersWithDailyId.filter((order: any) => {
    const customerName = order.customers?.name || 'Walk-in Customer';
    const orderDate = new Date(order.created_at);

    // Filter by order type if not 'all'
    const matchesOrderType = orderTypeFilter === 'all' || order.order_type === orderTypeFilter;

    // Filter by Role (using server_name tag)
    const activeRole = localStorage.getItem('active_role');
    let matchesRole = true;
    if (activeRole && activeRole !== 'admin') {
      const serverName = (order as any).server_name || '';
      matchesRole = serverName.startsWith(`[${activeRole}]`);
    }

    // Filter by date range if set
    let matchesDateRange = true;
    if (date?.from) {
      if (date.to) {
        matchesDateRange = isWithinInterval(orderDate, {
          start: startOfDay(date.from),
          end: endOfDay(date.to),
        });
      } else {
        // If only from is selected, check if it's the same day
        matchesDateRange = orderDate >= startOfDay(date.from) && orderDate <= endOfDay(date.from);
      }
    }

    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.dailyId && order.dailyId.includes(searchQuery));

    return matchesOrderType && matchesDateRange && matchesSearch && matchesRole;
  });

  const getPaymentBadge = (method: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      cash: 'default',
      card: 'secondary',
      wallet: 'outline',
    };
    return <Badge variant={variants[method] || 'outline'}>{method}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    return status === 'completed' ? (
      <Badge className="bg-green-500 hover:bg-green-600 text-white">Completed</Badge>
    ) : (
      <Badge variant="destructive">Refunded</Badge>
    );
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b bg-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Orders</h1>
              <p className="text-muted-foreground">View and manage order history</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handlePrintSummary()}
                variant="outline"
                className="bg-indigo-600 hover:bg-indigo-700 text-white border-none"
                disabled={todayOrders.length === 0}
              >
                <PrinterCheck className="h-4 w-4 mr-2" />
                Print Today's Summary
              </Button>
              <Button
                variant="outline"
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                onClick={() => onPrintProductSummary('')}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Product Summary
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All History
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete ALL order history from the database. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteAllMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete All History
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Today
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all orders created today. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteTodayMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete Today's Orders
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "LLL dd, y")} -{" "}
                          {format(date.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(date.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Date Range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                  />
                  <div className="p-3 border-t flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDate({ from: undefined, to: undefined })}
                      className="text-xs h-8"
                    >
                      Clear Range
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={orderTypeFilter !== 'all' ? "default" : "outline"} className={orderTypeFilter !== 'all' ? "bg-blue-600 hover:bg-blue-700" : ""}>
                    <Filter className="h-4 w-4 mr-2" />
                    {orderTypeFilter === 'all' ? 'Filter' : orderTypeFilter.replace('_', ' ').toUpperCase()}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setOrderTypeFilter('all')} className={orderTypeFilter === 'all' ? "bg-accent" : ""}>
                    All Orders
                  </DropdownMenuItem>
                  <Separator className="my-1" />
                  <DropdownMenuItem onClick={() => setOrderTypeFilter('dine_in')} className={orderTypeFilter === 'dine_in' ? "bg-accent" : ""}>
                    Dine In
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOrderTypeFilter('take_away')} className={orderTypeFilter === 'take_away' ? "bg-accent" : ""}>
                    Take Away
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOrderTypeFilter('delivery')} className={orderTypeFilter === 'delivery' ? "bg-accent" : ""}>
                    Delivery
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order ID or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Orders Table */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Daily #</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Server</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-bold text-lg">
                        {order.dailyId ? `#${order.dailyId}` : '-'}
                      </TableCell>
                      <TableCell className="font-medium text-muted-foreground text-xs">{order.id.slice(0, 8)}...</TableCell>
                      <TableCell>{order.customers?.name || 'Walk-in Customer'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {order.order_type?.replace('_', ' ') || 'Dine In'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">Rs {Number(order.total_amount).toLocaleString()}</TableCell>
                      <TableCell>{getPaymentBadge(order.payment_method)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(order.created_at), 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.server_name ? order.server_name.replace(/^\[.*?\]\s*/, '') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="View Details"
                            onClick={() => onViewOrderDetails(order.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onPrintBill(order.id)}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print Bill
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onPrintKOTDuplicate(order.id)}>
                                <UtensilsCrossed className="h-4 w-4 mr-2" />
                                Duplicate KOT
                              </DropdownMenuItem>
                              {order.status === 'completed' && (
                                <DropdownMenuItem className="text-destructive">
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Refund Order
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t bg-card text-sm text-muted-foreground">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>

        {/* Hidden Summary for Printing */}
        <div className="hidden">
          <DailySummary
            ref={summaryRef}
            orders={ordersWithDailyId.filter((o: any) => isToday(new Date(o.created_at)))}
            date={new Date()}
          />
          <ProductSalesSummary
            ref={productSummaryRef}
            date={date?.from || new Date()}
            query={productQuery}
            orders={productOrdersWithItems}
          />
          {printingOrder && (
            <Receipt
              ref={receiptRef}
              order={printingOrder}
            />
          )}
          {printingKOTOrder && (
            <KOT
              ref={kotRef}
              order={printingKOTOrder}
              isDuplicate={true}
            />
          )}
          {billOrder && (
            <Bill
              ref={billRef}
              order={billOrder}
            />
          )}
        </div>

        {/* Order Details Modal */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="max-w-md overflow-hidden p-0 bg-white">
            <DialogHeader className="pt-4 px-4 pb-2">
              <DialogTitle className="flex justify-between items-center text-lg">
                Order Details
              </DialogTitle>
              <DialogDescription className="sr-only">
                Detailed view of order #{viewingOrder?.dailyId || viewingOrder?.id?.slice(0, 8)}
              </DialogDescription>
            </DialogHeader>

            {viewingOrder && (
              <div className="max-h-[80vh] overflow-y-auto px-1 pb-4">
                <Bill order={{
                  ...viewingOrder,
                  orderNumber: viewingOrder.dailyId || viewingOrder.id.slice(0, 8),
                  items: viewingOrder.order_items.map((item: any) => ({
                    product: {
                      name: item.products?.name || item.product_name || 'Item',
                      price: item.price,
                    },
                    quantity: item.quantity,
                    lineTotal: item.price * item.quantity
                  })),
                  customer: viewingOrder.customers ? {
                    name: viewingOrder.customers.name,
                    phone: viewingOrder.customers.phone || ''
                  } : null,
                  subtotal: viewingOrder.total_amount, // Simplified for view
                  total: viewingOrder.total_amount,
                  orderType: viewingOrder.order_type,
                  createdAt: new Date(viewingOrder.created_at),
                  tableId: viewingOrder.restaurant_tables?.table_number,
                  serverName: viewingOrder.server_name
                }} />
              </div>
            )}

            <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowViewModal(false)}>Close</Button>
              <Button onClick={() => {
                onPrintBill(viewingOrder.id);
                setShowViewModal(false);
              }}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default OrdersPage;
