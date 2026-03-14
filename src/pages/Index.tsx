import MainLayout from '@/components/layout/MainLayout';
import ProductGrid from '@/components/pos/ProductGrid';
import CartPanel from '@/components/pos/CartPanel';

const Index = () => {
  return (
    <MainLayout>
      <div className="flex h-full">
        {/* Product Grid - Main Area */}
        <div className="flex-1 min-w-0">
          <ProductGrid />
        </div>
        
        {/* Cart Panel - Right Side */}
        <div className="w-[340px] flex-shrink-0">
          <CartPanel />
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
