import { FileVideo, Shield, Zap, Lock, Eye, Wallet } from "lucide-react";

const features = [
  {
    icon: FileVideo,
    title: "Multi-Format Support",
    description: "Upload videos, images, 3D models, PDFs, dashboards. All file types secured and protected.",
    accent: "from-primary to-[hsl(var(--primary-glow))]",
  },
  {
    icon: Lock,
    title: "Dynamic Watermarks",
    description: "Auto-generated watermarks with client name and timestamp prevent unauthorized sharing.",
    accent: "from-accent to-[hsl(var(--accent-glow))]",
  },
  {
    icon: Eye,
    title: "Preview-Only Access",
    description: "Clients view watermarked previews before payment. Full access unlocks after verification.",
    accent: "from-primary to-accent",
  },
  {
    icon: Zap,
    title: "Instant Payouts",
    description: "Receive payments directly to your UPI within 60 seconds. No waiting, no hassle.",
    accent: "from-accent to-primary",
  },
  {
    icon: Shield,
    title: "Bank-Level Security",
    description: "AES-256 encryption, JWT authentication, and secure S3 storage for your digital assets.",
    accent: "from-[hsl(var(--primary-dark))] to-primary",
  },
  {
    icon: Wallet,
    title: "Automated Payments",
    description: "Cashfree integration handles UPI, cards, and automatic revenue splitting seamlessly.",
    accent: "from-[hsl(var(--accent-glow))] to-accent",
  },
];

export const Features = () => {
  return (
    <section className="py-32 px-6 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.05),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent)/0.05),transparent_50%)]" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <div className="inline-block mb-4">
            <span className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-display font-semibold">
              FEATURES
            </span>
          </div>
          <h2 className="text-5xl md:text-6xl font-display font-bold mb-6">
            Everything You Need,
            <br />
            <span className="bg-gradient-to-r from-primary via-[hsl(var(--primary-glow))] to-accent bg-clip-text text-transparent">
              Nothing You Don't
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light">
            Built for creators who value their work and deserve secure, automated delivery
          </p>
        </div>
        
        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-8 hover:bg-card/80 transition-all duration-500 hover:shadow-[0_20px_60px_hsl(var(--primary)/0.15)] hover:-translate-y-1"
            >
              {/* Gradient Orb */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br opacity-20 rounded-full blur-2xl group-hover:opacity-30 transition-opacity" 
                   style={{ background: `linear-gradient(135deg, ${feature.accent})` }} />
              
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.accent} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              
              <h3 className="font-display text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed font-light">{feature.description}</p>
              
              {/* Hover Border Effect */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary/0 via-primary/50 to-accent/0 opacity-0 group-hover:opacity-20 transition-opacity duration-500" 
                   style={{ padding: '1px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
