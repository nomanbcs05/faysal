import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Shield, Users } from "lucide-react";

type Role = "admin" | "cashier" | "cashier2";

const Welcome = () => {
  const navigate = useNavigate();

  const handleRoleSelect = (role: Role) => {
    navigate("/login", { state: { role } });
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 font-sans overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/restaurant-hero.jpg?v=1'), url('/restaurant-luxury.png?v=2')" }}
      />
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mb-8 text-center space-y-2 text-white"
      >
        <div className="mx-auto inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/85 mb-4 shadow-lg ring-2 ring-white/30 overflow-hidden backdrop-blur">
          <img
            src="/gx.png"
            alt="GX"
            className="object-contain w-16 h-16"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
        <h1 className="text-5xl font-black tracking-tighter font-heading uppercase drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">Gen XCloud POS</h1>
        <p className="text-white/80 text-lg font-medium">Select your role to continue</p>
      </motion.div>

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
        {/* Admin Card */}
        <RoleCard
          title="Administrator"
          icon={Shield}
          description="Full access to all settings and reports"
          onSelect={() => handleRoleSelect("admin")}
        />

        {/* Cashier Card */}
        <RoleCard
          title="Anas"
          icon={User}
          description="Process orders and manage payments"
          onSelect={() => handleRoleSelect("cashier")}
        />

        {/* Cashier 2 Card */}
        <RoleCard
          title="Cashier 2"
          icon={Users}
          description="Secondary station for peak hours"
          onSelect={() => handleRoleSelect("cashier2")}
        />
      </div>

      <div className="absolute bottom-6 right-6 z-10 text-white/80 text-sm">
        © 2026 Gen XCloud POS. All rights reserved.
      </div>
    </div>
  );
};

interface RoleCardProps {
  title: string;
  icon: any;
  description: string;
  onSelect: () => void;
}

const RoleCard = ({ title, icon: Icon, description, onSelect }: RoleCardProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer relative overflow-hidden rounded-xl border-2 border-slate-200 bg-white transition-all duration-200 hover:border-primary/50 hover:shadow-md"
      onClick={onSelect}
    >
      <div className="p-6 flex flex-col items-center text-center space-y-4">
        <div className="p-4 rounded-full bg-slate-100 text-slate-600 group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-black text-xl text-slate-900 font-heading uppercase tracking-tight">{title}</h3>
          <p className="text-sm text-slate-500 mt-1 font-medium">{description}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default Welcome;
