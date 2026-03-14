import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, User, Search, X, Printer, Wallet, ChefHat, FileText, Tag, CheckCircle2 } from 'lucide-react';
import Fuse from 'fuse.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCartStore, Customer } from '@/stores/cartStore';
import Receipt from './Receipt';
import KOT from './KOT';
import Bill from './Bill';
import RiderSelectionModal from './RiderSelectionModal';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

import TableSelectionModal from './TableSelectionModal';

const CartPanel = () => {
  const navigate = useNavigate();
  const {
    items,
    customer,
    subtotal,
    taxAmount,
    discountAmount,
    total,
    updateQuantity,
    removeItem,
    setCustomer,
    orderType,
    setOrderType,
    clearCart,
    discount,
    discountType,
    setDiscount,
    deliveryFee,
    tableId,
    setTableId,
    rider,
    setRider,
    customerAddress,
    setCustomerAddress,
    serverName,
    setServerName,
    editingOrderId
  } = useCartStore();

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wallet'>('cash');
  const [discountInput, setDiscountInput] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [showKOT, setShowKOT] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [pendingAfterRider, setPendingAfterRider] = useState<'none' | 'bill' | 'complete'>('none');
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [cashierName, setCashierName] = useState('Anas');
  const receiptRef = useRef<HTMLDivElement>(null);
  const kotRef = useRef<HTMLDivElement>(null);
  const billRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        if (user.email?.toLowerCase() === 'atifzaidi1978@gmail.com') {
          setCashierName('Anas');
        } else {
          setCashierName(user.user_metadata?.name || user.email.split('@')[0]);
        }
      }
    };
    fetchUser();
  }, []);

  const getServerNameWithRole = () => {
    const role = localStorage.getItem('active_role');
    if (role && role !== 'admin') {
      return `[${role}] ${serverName || ''}`.trim();
    }
    return serverName || null;
  };

  // Fetch tables to display selected table number
  const { data: tables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: api.tables.getAll,
  }) as any;

  // Fetch customers
  const { data: dbCustomers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: api.customers.getAll,
  });

  const customers = useMemo(() => {
    return dbCustomers.map((c: any) => ({
      id: c.customer_id.toString(),
      name: c.name,
      phone: c.phone,
      email: c.email,
      loyaltyPoints: c.loyalty_points || 0,
      totalSpent: Number(c.total_spent) || 0,
      visitCount: c.total_orders || 0
    }));
  }, [dbCustomers]);

  const selectedTable = useMemo(() =>
    tables.find((t: any) => t.table_id === tableId),
    [tables, tableId]
  );

  const { data: openRegister } = useQuery({
    queryKey: ['open-register'],
    queryFn: api.registers.getOpen,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      if (editingOrderId) {
        return api.orders.update(editingOrderId, orderData.order, orderData.items);
      }
      return api.orders.create(orderData.order, orderData.items);
    },
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['ongoing-orders'] });

      // If it was an update, newOrder might just be 'true' or the updated order
      // We need to handle both cases for setLastOrder
      if (editingOrderId) {
        setLastOrder((prev: any) => ({ ...prev, id: editingOrderId }));
      } else if (newOrder && typeof newOrder === 'object') {
        setLastOrder((prev: any) => ({ ...prev, id: newOrder.id }));
      }

      setShowReceipt(true);

      // Small delay to allow dialog to open, then print
      setTimeout(() => {
        handlePrint();
        // Fallback close in case onAfterPrint doesn't fire (some browsers)
        setTimeout(() => setShowReceipt(false), 2000);
        toast.success(editingOrderId ? `Order updated!` : `Order completed!`);
      }, 300);
    },
    onError: (error: any) => {
      console.error('Order creation failed:', error);
      // Supabase errors are objects with a message property, not necessarily Error instances
      const errorMessage = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      console.error('Detailed error message:', errorMessage);
      toast.error(`Failed to save order: ${errorMessage}`);
    }
  });

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${lastOrder?.orderNumber}`,
    onAfterPrint: () => {
      toast.success('Receipt printed successfully');
      setShowReceipt(false);
      clearCart();
      navigate('/ongoing-orders');
    },
  });

  const handlePrintKOT = useReactToPrint({
    contentRef: kotRef,
    documentTitle: `KOT-${Date.now()}`,
    onAfterPrint: () => {
      toast.success('KOT printed successfully');
      setShowKOT(false);
      clearCart();
      navigate('/ongoing-orders');
    },
  });

  const handlePrintBill = useReactToPrint({
    contentRef: billRef,
    documentTitle: `Bill-${Date.now()}`,
    onAfterPrint: async () => {
      toast.success('Bill printed successfully');

      // When bill is printed from the cart, we should save the order as completed
      // because the user wants to "save all the orders whose bills was printed once"
      if (items.length > 0) {
        try {
          const orderInsert = {
            customer_id: customer?.id ? parseInt(customer.id) : null,
            total_amount: total,
            status: 'completed',
            payment_method: paymentMethod,
            order_type: orderType,
            table_id: tableId || null,
            server_name: getServerNameWithRole(),
          };

          const orderItemsInsert = items.map(item => ({
            product_id: item.product.id,
            product_name: item.product.name,
            product_category: item.product.category,
            quantity: item.quantity,
            price: item.product.price
          }));

          const toastId = toast.loading('Saving order after bill print...');

          if (editingOrderId) {
            await api.orders.update(editingOrderId, orderInsert, orderItemsInsert);
          } else {
            await api.orders.create(orderInsert, orderItemsInsert);
          }

          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['ongoing-orders'] });

          toast.dismiss(toastId);
          toast.success('Order saved as completed');

          // Clear cart after printing bill if it's considered a completion action
          clearCart();
        } catch (error) {
          console.error('Failed to auto-save order after bill print:', error);
          toast.error('Failed to save order');
        }
      }

      setShowBill(false);
    },
  });

  const performShowBill = async () => {
    const orderData = await prepareOrderData();
    setLastOrder(orderData);
    setShowBill(true);
  };

  const prepareOrderData = async (): Promise<{
    id?: string;
    orderNumber: string;
    items: typeof items;
    customer: typeof customer;
    rider: typeof rider;
    customerAddress: typeof customerAddress;
    serverName: typeof serverName;
    tableId: typeof tableId;
    orderType: typeof orderType;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    deliveryFee: number;
    total: number;
    paymentMethod: typeof paymentMethod;
    createdAt: Date;
    cashierName: typeof cashierName;
  }> => {
    const count = await api.orders.getDailyCount();
    const dailyId = (count + 1).toString().padStart(2, '0');

    return {
      orderNumber: dailyId,
      items: [...items],
      customer,
      rider, // Include rider
      customerAddress, // Include address
      serverName: (() => {
        const role = localStorage.getItem('active_role');
        if (role && role !== 'admin') {
          return `[${role}] ${serverName || ''}`.trim();
        }
        return serverName;
      })(), // Include server name with role tag
      tableId, // Include tableId
      orderType,
      subtotal,
      taxAmount,
      discountAmount,
      deliveryFee,
      total,
      paymentMethod,
      createdAt: new Date(),
      cashierName, // Use real cashier name
    };
  };

  const createKOTOrderMutation = useMutation({
    mutationFn: async (orderData: { order: any; items: any[] }) => {
      if (editingOrderId) {
        return api.orders.update(editingOrderId, orderData.order, orderData.items);
      }
      return api.orders.create(orderData.order, orderData.items);
    },
    onSuccess: async (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ['ongoing-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      // Prepare order data for KOT printing
      const orderData = await prepareOrderData();
      if (editingOrderId) {
        orderData.id = editingOrderId;
      } else if (newOrder && typeof newOrder === 'object') {
        orderData.id = newOrder.id;
      }
      setLastOrder(orderData);
      setShowKOT(true);

      // Print KOT after a short delay to allow dialog render
      setTimeout(() => {
        handlePrintKOT();
      }, 500);
    },
    onError: (error: any) => {
      console.error('Order creation failed:', error);
      const errorMessage = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      toast.error(`Failed to save order: ${errorMessage}`);
    }
  });



  const handleDone = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // Create order with 'pending' status
    const orderInsert = {
      customer_id: customer?.id ? parseInt(customer.id) : null,
      total_amount: total,
      status: 'pending', // Set as pending for ongoing orders
      payment_method: 'cash', // Default payment method
      order_type: orderType,
      table_id: tableId || null,
      server_name: getServerNameWithRole(),
    };

    const orderItemsInsert = items.map(item => ({
      product_id: item.product.id,
      product_name: item.product.name,
      product_category: item.product.category,
      quantity: item.quantity,
      price: item.product.price
    }));

    const toastId = toast.loading('Saving order...');
    createKOTOrderMutation.mutate({ order: orderInsert, items: orderItemsInsert }, {
      onSettled: () => {
        toast.dismiss(toastId);
      }
    });
  };

  const handleShowBill = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (orderType === 'delivery' && !rider) {
      setPendingAfterRider('bill');
      setShowRiderModal(true);
      return;
    }
    await performShowBill();
  };

  const performCompleteSale = async () => {
    const orderInsert = {
      customer_id: customer?.id ? parseInt(customer.id) : null,
      total_amount: total,
      status: 'completed',
      payment_method: paymentMethod,
      order_type: orderType,
      table_id: tableId || null,
      server_name: getServerNameWithRole(),
    };

    const orderItemsInsert = items.map(item => ({
      product_id: item.product.id,
      product_name: item.product.name,
      product_category: item.product.category,
      quantity: item.quantity,
      price: item.product.price
    }));

    const localOrder = await prepareOrderData();
    setLastOrder(localOrder);

    const toastId = toast.loading('Processing order...');
    createOrderMutation.mutate({ order: orderInsert, items: orderItemsInsert }, {
      onSettled: () => {
        toast.dismiss(toastId);
      }
    });
  };

  const handleCompleteSale = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (orderType === 'delivery' && !rider) {
      setPendingAfterRider('complete');
      setShowRiderModal(true);
      return;
    }
    await performCompleteSale();
  };

  const handleClearCart = () => {
    if (items.length === 0) return;
    clearCart();
    toast.info('Cart cleared');
  };

  useEffect(() => {
    if (orderType !== 'delivery') {
      if (pendingAfterRider !== 'none') {
        setPendingAfterRider('none');
      }
      return;
    }
    if (!rider || pendingAfterRider === 'none') return;
    const action = pendingAfterRider;
    setPendingAfterRider('none');
    if (action === 'bill') {
      performShowBill();
    } else if (action === 'complete') {
      performCompleteSale();
    }
  }, [orderType, rider, pendingAfterRider]);

  return (
    <div className="flex flex-col h-full bg-card border-l font-sans">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-black font-heading tracking-tight uppercase">Current Order</h2>
        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      {/* Customer Selection */}
      <div className="p-4 border-b space-y-4">
        <CustomerSelector
          selectedCustomer={customer}
          onSelect={setCustomer}
          customers={customers}
        />

        {orderType === 'dine_in' && (
          <div
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={() => setShowTableModal(true)}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs",
                selectedTable ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-500 border border-gray-200"
              )}>
                {selectedTable ? selectedTable.table_number : "?"}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {selectedTable ? `Table ${selectedTable.table_number}` : 'No Table Selected'}
                </span>
                {selectedTable && (
                  <span className="text-xs text-muted-foreground capitalize">
                    {selectedTable.section} • {selectedTable.capacity} Seats
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cart Items */}
      <ScrollArea className="flex-1 p-4">
        <AnimatePresence mode="popLayout">
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-muted-foreground"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Wallet className="h-8 w-8" />
              </div>
              <p className="font-medium">Cart is empty</p>
              <p className="text-sm">Add items to start a sale</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 p-3 bg-background rounded-lg border"
                >
                  <div className="h-10 w-10 rounded overflow-hidden bg-secondary flex items-center justify-center shrink-0">
                    {item.product.image?.startsWith('http') ? (
                      <img src={item.product.image} alt={item.product.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl">{item.product.image}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold font-heading text-sm truncate tracking-tight">{item.product.name}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Rs {item.product.price.toLocaleString()} each
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>

                    <span className="w-8 text-center font-medium text-sm">
                      {item.quantity}
                    </span>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="text-right min-w-[60px]">
                    <p className="font-semibold text-sm">Rs {item.lineTotal.toLocaleString()}</p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item.product.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>

      {/* Payment Section */}
      <div className="border-t p-4 space-y-4 bg-muted/30">
        {/* Totals */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold font-heading uppercase tracking-wider text-[10px]">Subtotal</span>
            <span className="font-bold">Rs {subtotal.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-slate-500 font-bold font-heading uppercase tracking-wider text-[10px]">
              <span>Discount</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-5 w-5 rounded-full">
                    <Tag className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-4" align="start">
                  <div className="space-y-4">
                    <h4 className="font-medium leading-none">Set Discount</h4>
                    <Tabs defaultValue={discountType} onValueChange={(v) => {
                      setDiscount(0, v as 'percentage' | 'fixed');
                      setDiscountInput('');
                    }}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="percentage">% Percent</TabsTrigger>
                        <TabsTrigger value="fixed">Rs Fixed</TabsTrigger>
                      </TabsList>
                      <div className="pt-4">
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder={discountType === 'percentage' ? "Percentage (0-100)" : "Amount (Rs)"}
                            value={discountInput}
                            onChange={(e) => {
                              setDiscountInput(e.target.value);
                              setDiscount(Number(e.target.value), discountType);
                            }}
                          />
                        </div>
                      </div>
                    </Tabs>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setDiscount(0, 'percentage');
                        setDiscountInput('');
                      }}
                    >
                      Remove Discount
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <span className={discountAmount > 0 ? "text-success font-medium" : ""}>
              {discountAmount > 0 ? `-Rs ${discountAmount.toLocaleString()}` : '-'}
            </span>
          </div>

          {deliveryFee > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold font-heading uppercase tracking-wider text-[10px]">Delivery Fee</span>
              <span className="font-bold">Rs {deliveryFee.toLocaleString()}</span>
            </div>
          )}

          <Separator className="bg-slate-200" />
          <div className="flex justify-between text-2xl font-black font-heading tracking-tighter uppercase text-slate-900">
            <span>Total</span>
            <span>Rs {total.toLocaleString()}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 font-bold font-heading uppercase tracking-wider text-xs h-11 border-2 border-emerald-500/20 hover:bg-emerald-50 hover:text-emerald-600 transition-all" onClick={handleDone} disabled={items.length === 0}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Done
            </Button>
            <Button variant="outline" className="flex-1 font-bold font-heading uppercase tracking-wider text-xs h-11" onClick={handleShowBill} disabled={items.length === 0}>
              <FileText className="h-4 w-4 mr-2" />
              Bill
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 font-bold font-heading uppercase tracking-wider text-xs h-11"
              onClick={handleClearCart}
              disabled={items.length === 0}
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button
              className="flex-[2] btn-success font-black font-heading uppercase tracking-widest text-sm h-11 shadow-lg shadow-emerald-500/20"
              onClick={handleCompleteSale}
              disabled={items.length === 0}
            >
              <Printer className="h-4 w-4 mr-2" />
              Complete Sale
            </Button>
          </div>
        </div>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md" aria-describedby="receipt-description">
          <DialogHeader>
            <DialogTitle>Receipt Preview</DialogTitle>
            <DialogDescription id="receipt-description" className="sr-only">Order Receipt</DialogDescription>
          </DialogHeader>
          {lastOrder && (
            <div className="max-h-[70vh] overflow-auto">
              <Receipt ref={receiptRef} order={lastOrder} />
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowReceipt(false)}>
              Close
            </Button>
            <Button className="flex-1" onClick={() => {
              handlePrint();
              setTimeout(() => setShowReceipt(false), 2000);
            }}>
              <Printer className="h-4 w-4 mr-2" />
              Print Again
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* KOT Dialog */}
      <Dialog open={showKOT} onOpenChange={setShowKOT}>
        <DialogContent className="max-w-md" aria-describedby="kot-description">
          <DialogHeader>
            <DialogTitle>KOT Preview</DialogTitle>
            <DialogDescription id="kot-description" className="sr-only">Kitchen Order Ticket</DialogDescription>
          </DialogHeader>
          {lastOrder && (
            <div className="max-h-[70vh] overflow-auto">
              <KOT ref={kotRef} order={lastOrder} />
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowKOT(false)}>
              Close
            </Button>
            <Button className="flex-1" onClick={() => handlePrintKOT()}>
              <Printer className="h-4 w-4 mr-2" />
              Print KOT
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bill Dialog */}
      <Dialog open={showBill} onOpenChange={setShowBill}>
        <DialogContent className="max-w-md" aria-describedby="bill-description">
          <DialogHeader>
            <DialogTitle>Bill Preview</DialogTitle>
            <DialogDescription id="bill-description" className="sr-only">Customer Bill</DialogDescription>
          </DialogHeader>
          {lastOrder && (
            <div className="max-h-[70vh] overflow-auto">
              <Bill ref={billRef} order={lastOrder} />
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowBill(false)}>
              Close
            </Button>
            <Button className="flex-1" onClick={() => handlePrintBill()}>
              <Printer className="h-4 w-4 mr-2" />
              Print Bill
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <RiderSelectionModal
        isOpen={showRiderModal}
        onClose={() => setShowRiderModal(false)}
      />
      <TableSelectionModal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
      />
    </div>
  );
};

interface CustomerSelectorProps {
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer | null) => void;
  customers: Customer[];
}

const CustomerSelector = ({ selectedCustomer, onSelect, customers }: CustomerSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fuse = useMemo(() => new Fuse(customers, {
    keys: ['name', 'phone', 'email'],
    threshold: 0.3,
  }), [customers]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers.slice(0, 50); // Show first 50 by default
    return fuse.search(searchQuery).slice(0, 50).map(r => r.item);
  }, [searchQuery, fuse, customers]);

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start h-12 text-base shadow-sm border-2">
          <User className="h-5 w-5 mr-3 text-muted-foreground" />
          {selectedCustomer ? (
            <span className="truncate font-medium">{selectedCustomer.name}</span>
          ) : (
            <span className="text-muted-foreground">Select Customer</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        <ScrollArea className="h-64">
          <div className="p-2">
            {selectedCustomer && (
              <Button
                variant="ghost"
                className="w-full justify-start mb-2 text-muted-foreground"
                onClick={() => {
                  onSelect(null);
                  setOpen(false);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Selection
              </Button>
            )}

            {filteredCustomers.map((customer) => (
              <Button
                key={customer.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start mb-1",
                  selectedCustomer?.id === customer.id && "bg-primary/10"
                )}
                onClick={() => handleSelect(customer)}
              >
                <div className="flex flex-col items-start text-left">
                  <span className="font-medium">{customer.name}</span>
                  <span className="text-xs text-muted-foreground">{customer.phone}</span>
                </div>
              </Button>
            ))}

            {filteredCustomers.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No customers found
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-2 border-t text-xs text-center text-muted-foreground">
          Showing {filteredCustomers.length} of {customers.length} customers
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CartPanel;
