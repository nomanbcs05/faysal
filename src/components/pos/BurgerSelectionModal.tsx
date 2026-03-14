import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Utensils, ChefHat } from 'lucide-react';
import { cn } from "@/lib/utils";

interface BurgerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: any) => void;
}

interface BurgerItem {
  name: string;
  price: number;
}

const BURGER_DATA: BurgerItem[] = [
  { name: "Premium Spicy Zinger Burger", price: 450 },
  { name: "Peri Peri Sauce Burger", price: 450 },
  { name: "Creamy Mild Burger", price: 430 },
  { name: "Tangy Burger", price: 430 },
  { name: "Zinger Burger", price: 380 },
  { name: "Mighty Zinger Burger with Cheese", price: 700 },
  { name: "Zinger Tower Burger", price: 850 },
  { name: "Pizza Zinger Burger", price: 500 },
  { name: "Chicken Chapli Kabab Burger", price: 300 },
  { name: "Patty Burger", price: 250 },
];

export default function BurgerSelectionModal({ isOpen, onClose, onAdd }: BurgerSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [quantityPrefix, setQuantityPrefix] = useState<string>('');

  const filteredBurgers = BURGER_DATA.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddBurger = (burger: BurgerItem) => {
    const qty = parseInt(quantityPrefix) || 1;
    const burgerProduct = {
      id: `burger-${burger.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: burger.name,
      price: burger.price,
      category: 'Burgers',
      image: '🍔',
      sku: `BGR-${burger.name.substring(0,3).toUpperCase()}`,
      quantity: qty
    };
    
    // If quantity > 1, we might need to call onAdd multiple times if onAdd only adds 1
    // or modify onAdd to accept quantity. Checking common patterns, usually onAdd adds 1.
    // Let's call it 'qty' times.
    for (let i = 0; i < qty; i++) {
      onAdd(burgerProduct);
    }
    
    setQuantityPrefix('');
  };

  const handleNumberClick = (num: number) => {
    setQuantityPrefix(prev => {
      const newPrefix = prev + num.toString();
      // Limit to 2 digits for safety (max 99)
      return newPrefix.length > 2 ? newPrefix.slice(-2) : newPrefix;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white border-none rounded-3xl max-h-[90vh] h-[90vh] flex flex-col shadow-2xl [&>button]:hidden" aria-describedby="burger-selection-description">
        {/* Header */}
        <div className="bg-red-600 bg-gradient-to-br from-red-600 to-rose-700 px-6 py-5 text-white shrink-0 relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <ChefHat className="h-7 w-7" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black font-heading uppercase tracking-tight">Burgers Menu</DialogTitle>
                <DialogDescription id="burger-selection-description" className="text-red-50/80 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                  Premium & Juicy Burgers
                </DialogDescription>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-90"
            >
              <Plus className="h-6 w-6 rotate-45" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-red-100/50" />
            <Input
              placeholder="Search burgers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/10 border-none text-white placeholder:text-red-100/50 pl-10 h-11 text-sm rounded-xl focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-0"
            />
          </div>

          {/* Number Pad */}
          <div className="mt-4 bg-white/10 p-2 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-100/70">Select Quantity</span>
              {quantityPrefix && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black bg-white text-red-600 px-2 py-0.5 rounded-full animate-pulse">
                    Adding {quantityPrefix} items
                  </span>
                  <button 
                    onClick={() => setQuantityPrefix('')}
                    className="text-[10px] font-bold text-white/50 hover:text-white underline uppercase tracking-tighter"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-10 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberClick(num)}
                  className={cn(
                    "h-9 rounded-lg font-black text-sm transition-all active:scale-90 flex items-center justify-center",
                    quantityPrefix.includes(num.toString()) 
                      ? "bg-white text-red-600 shadow-lg shadow-black/10" 
                      : "bg-white/10 text-white hover:bg-white/20"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50/30 custom-scrollbar">
          <div className="p-6 grid grid-cols-1 gap-3">
            {filteredBurgers.map((burger) => (
              <button
                key={burger.name}
                onClick={() => handleAddBurger(burger)}
                className="group flex items-center justify-between p-4 bg-white hover:bg-red-50 rounded-2xl border border-slate-100 hover:border-red-200 shadow-sm hover:shadow-md transition-all text-left"
              >
                <div className="flex-1 pr-4">
                  <p className="font-bold font-heading text-slate-800 text-[15px] group-hover:text-red-700 transition-colors tracking-tight">{burger.name}</p>
                </div>
                <div className="flex items-center gap-5 shrink-0">
                  <span className="font-black font-heading text-slate-900 text-base tracking-tight">Rs {burger.price}</span>
                  <div className="h-8 w-8 rounded-full bg-slate-100 group-hover:bg-red-600 flex items-center justify-center transition-colors">
                    <Plus className="h-4 w-4 text-slate-400 group-hover:text-white" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">
            Tap an item to add to cart
          </p>
          <Button 
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black font-heading uppercase tracking-widest px-8 rounded-xl h-11"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
