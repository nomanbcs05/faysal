import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cartStore';
import { toast } from 'sonner';
import { User } from 'lucide-react';
import { motion } from 'framer-motion';

interface RiderSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RIDERS = [
  { id: 1, name: 'Ayaz' },
  { id: 2, name: 'Mumtaz' },
  { id: 3, name: 'Abuzar' },
  { id: 4, name: 'Zafar' },
];

const RiderSelectionModal = ({ isOpen, onClose }: RiderSelectionModalProps) => {
  const { setRider } = useCartStore();
  const [selectedRider, setSelectedRider] = useState<any>(null);

  const handleSelectRider = (rider: any) => {
    setSelectedRider(rider);
    setRider({ name: rider.name });
    toast.success(`Rider ${rider.name} assigned to delivery`);
    onClose();
    setTimeout(() => {
      setSelectedRider(null);
    }, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setSelectedRider(null);
        setAddress('');
        setCustomerName('');
        setCustomerPhone('');
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[500px] p-6 bg-background" aria-describedby="rider-selection-description">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold text-center">
            Select Rider
          </DialogTitle>
          <DialogDescription id="rider-selection-description" className="text-center">
            Choose a rider to assign this delivery order.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {RIDERS.map((rider) => (
            <motion.button
              key={rider.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectRider(rider)}
              className="p-6 rounded-xl border-2 border-muted hover:border-primary hover:bg-primary/5 bg-card transition-all flex flex-col items-center justify-center gap-2 h-32"
            >
              <User className="h-8 w-8 text-muted-foreground" />
              <h3 className="font-bold text-lg">{rider.name}</h3>
            </motion.button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RiderSelectionModal;
