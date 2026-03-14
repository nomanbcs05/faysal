import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Droplets, Layers } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SauceToppingSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: any) => void;
}

interface Item {
  name: string;
  price: number;
  type: 'sauce' | 'topping';
}

const SAUCES: Item[] = [
  { name: "Special Sauce", price: 100, type: 'sauce' },
  { name: "Peri Peri Sauce", price: 70, type: 'sauce' },
  { name: "Garlic Mayo Sauce", price: 50, type: 'sauce' },
  { name: "Dip Mayo Sauce", price: 50, type: 'sauce' },
  { name: "Ketchup Dip", price: 50, type: 'sauce' },
  { name: "Mayo Dip", price: 50, type: 'sauce' },
  { name: "Green Chatni", price: 30, type: 'sauce' },
  { name: "Raita", price: 30, type: 'sauce' },
];

const TOPPINGS: Item[] = [
  { name: "Cheese 30 Grams", price: 100, type: 'topping' },
  { name: "Meat 50 Grams", price: 100, type: 'topping' },
  { name: "Cheese Slice", price: 50, type: 'topping' },
  { name: "Plain Paratha", price: 50, type: 'topping' },
  { name: "Bun", price: 30, type: 'topping' },
];

export default function SauceToppingSelectionModal({ isOpen, onClose, onAdd }: SauceToppingSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'sauces' | 'toppings'>('sauces');

  const filteredSauces = SAUCES.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredToppings = TOPPINGS.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = (item: Item) => {
    const product = {
      id: `${item.type}-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: item.name,
      price: item.price,
      category: item.type === 'sauce' ? 'Sauces' : 'Toppings',
      image: item.type === 'sauce' ? '🥣' : '🧀',
      sku: `${item.type === 'sauce' ? 'SAU' : 'TOP'}-${item.name.substring(0,3).toUpperCase()}`
    };
    onAdd(product);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white border-none rounded-3xl max-h-[90vh] h-[90vh] flex flex-col shadow-2xl [&>button]:hidden">
        {/* Header */}
        <div className="bg-yellow-500 bg-gradient-to-br from-yellow-500 to-amber-600 px-6 py-5 text-white shrink-0 relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Droplets className="h-7 w-7 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black font-heading uppercase tracking-tight">Sauces & Toppings</DialogTitle>
                <DialogDescription className="text-yellow-100 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                  Extra Flavours & Add-ons
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
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-800/50" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/20 border-none text-white placeholder:text-yellow-800/50 pl-10 h-11 text-sm rounded-xl focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sauces" className="flex-1 flex flex-col overflow-hidden" onValueChange={(v) => setActiveTab(v as any)}>
          <div className="px-6 pt-4 bg-white shrink-0">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-2xl h-12">
              <TabsTrigger 
                value="sauces" 
                className="rounded-xl font-black font-heading text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-yellow-600 data-[state=active]:shadow-sm transition-all"
              >
                <Droplets className="h-4 w-4 mr-2" />
                Sauces
              </TabsTrigger>
              <TabsTrigger 
                value="toppings" 
                className="rounded-xl font-black font-heading text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-yellow-600 data-[state=active]:shadow-sm transition-all"
              >
                <Layers className="h-4 w-4 mr-2" />
                Toppings
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
            <TabsContent value="sauces" className="m-0 p-6 pt-4">
              <div className="grid grid-cols-1 gap-3">
                {filteredSauces.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleAddItem(item)}
                    className="group flex items-center justify-between p-4 bg-white hover:bg-yellow-50/50 rounded-2xl border border-slate-100 hover:border-yellow-200 shadow-sm hover:shadow-md transition-all text-left"
                  >
                    <div className="flex-1 pr-4">
                      <p className="font-bold font-heading text-slate-800 text-[15px] group-hover:text-yellow-700 transition-colors tracking-tight">{item.name}</p>
                    </div>
                    <div className="flex items-center gap-5 shrink-0">
                      <span className="font-black font-heading text-slate-900 text-base tracking-tight">Rs {item.price}</span>
                      <div className="h-8 w-8 rounded-full bg-slate-100 group-hover:bg-yellow-500 flex items-center justify-center transition-colors">
                        <Plus className="h-4 w-4 text-slate-400 group-hover:text-white" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="toppings" className="m-0 p-6 pt-4">
              <div className="grid grid-cols-1 gap-3">
                {filteredToppings.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleAddItem(item)}
                    className="group flex items-center justify-between p-4 bg-white hover:bg-yellow-50/50 rounded-2xl border border-slate-100 hover:border-yellow-200 shadow-sm hover:shadow-md transition-all text-left"
                  >
                    <div className="flex-1 pr-4">
                      <p className="font-bold text-slate-800 text-[15px] group-hover:text-yellow-700 transition-colors">{item.name}</p>
                    </div>
                    <div className="flex items-center gap-5 shrink-0">
                      <span className="font-black text-slate-900 text-base">Rs {item.price}</span>
                      <div className="h-8 w-8 rounded-full bg-slate-100 group-hover:bg-yellow-500 flex items-center justify-center transition-colors">
                        <Plus className="h-4 w-4 text-slate-400 group-hover:text-white" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </TabsContent>
          </div>
        </Tabs>

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
