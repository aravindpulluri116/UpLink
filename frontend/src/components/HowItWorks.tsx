import { Upload, Eye, CreditCard, Download } from "lucide-react";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Upload Your Assets",
    description: "Drag and drop your videos, images, 3D files, or documents. We handle the rest.",
    color: "from-primary to-[hsl(var(--primary-glow))]",
  },
  {
    icon: Eye,
    step: "02",
    title: "Share Preview Link",
    description: "Send clients a secure link with watermarked previews. No downloads yet.",
    color: "from-[hsl(var(--primary-glow))] to-accent",
  },
  {
    icon: CreditCard,
    step: "03",
    title: "Client Pays",
    description: "Client completes payment via UPI or card through Cashfree gateway.",
    color: "from-accent to-[hsl(var(--accent-glow))]",
  },
  {
    icon: Download,
    step: "04",
    title: "Instant Access",
    description: "Full, unwatermarked files unlock automatically. You receive payment instantly.",
    color: "from-[hsl(var(--accent-glow))] to-primary",
  },
];

export const HowItWorks = () => {
  return (
    <section className="py-32 px-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <div className="inline-block mb-4">
            <span className="px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-display font-semibold">
              HOW IT WORKS
            </span>
          </div>
          <h2 className="text-5xl md:text-6xl font-display font-bold mb-6">
            Four Steps to
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Secure Success
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light">
            Simple process, powerful results
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-24 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary via-accent to-primary opacity-20" />
          
          {steps.map((item, index) => (
            <div key={index} className="relative group">
              <div className="text-center">
                {/* Step Number with Icon */}
                <div className="relative inline-block mb-6">
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${item.color} text-white font-display font-bold text-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 relative z-10`}>
                    {item.step}
                  </div>
                  {/* Glow Effect */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${item.color} blur-xl opacity-30 group-hover:opacity-50 transition-opacity`} />
                  
                  {/* Floating Icon */}
                  <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                
                <h3 className="font-display text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground text-sm font-light leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
