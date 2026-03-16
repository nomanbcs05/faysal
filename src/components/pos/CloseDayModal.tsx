
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Calculator, Save } from 'lucide-react';

interface CloseDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  registerId: string;
  startingAmount: number;
}

const CloseDayModal = ({ isOpen, onClose, registerId, startingAmount }: CloseDayModalProps) => {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const closeDayMutation = useMutation({
    mutationFn: async ({ amount, notes }: { amount: number; notes: string }) => {
      return api.registers.close(registerId, amount, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-register'] });
      toast.success('Shift closed successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error('Failed to close shift: ' + error.message);
    }
  });

  const handleClose = () => {
    if (!amount) {
      toast.error('Please enter the ending amount');
      return;
    }
    closeDayMutation.mutate({ amount: Number(amount), notes });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black font-heading uppercase tracking-tight">Close Shift</DialogTitle>
          <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5">
            Enter the final cash amount to close your daily register.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
            <span className="text-xs font-black font-heading uppercase tracking-widest text-slate-400">Starting Amount</span>
            <span className="text-lg font-black text-slate-900">Rs {startingAmount.toLocaleString()}</span>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black font-heading uppercase tracking-widest text-slate-500">Ending Cash Amount</Label>
            <div className="relative">
              <Calculator className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10 h-12 rounded-xl border-slate-200 focus:border-blue-500 transition-all font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black font-heading uppercase tracking-widest text-slate-500">Closing Notes (Optional)</Label>
            <Input
              placeholder="Any discrepancies or remarks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-12 rounded-xl border-slate-200 focus:border-blue-500 transition-all font-medium"
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-start gap-2">
          <Button
            type="button"
            className="flex-1 h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black font-heading uppercase tracking-widest shadow-lg transition-all"
            onClick={handleClose}
            disabled={closeDayMutation.isPending}
          >
            {closeDayMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Finalize & Close
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-xl font-black font-heading uppercase tracking-widest text-xs"
            onClick={onClose}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CloseDayModal;
