export const Stats = () => {
  const stats = [
    { 
      value: "10K+", 
      label: "Active Creators",
      gradient: "from-primary to-[hsl(var(--primary-glow))]"
    },
    { 
      value: "95%", 
      label: "Payment Success",
      gradient: "from-[hsl(var(--primary-glow))] to-accent"
    },
    { 
      value: "80%", 
      label: "Piracy Reduction",
      gradient: "from-accent to-[hsl(var(--accent-glow))]"
    },
    { 
      value: "60s", 
      label: "Avg. Payout Time",
      gradient: "from-[hsl(var(--accent-glow))] to-primary"
    },
  ];

  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center group">
              <div className={`text-5xl md:text-6xl font-display font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform`}>
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground font-display font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
