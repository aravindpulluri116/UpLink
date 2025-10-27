import { Button } from "@/components/ui/button";
import { Shield, Zap, Lock, ArrowRight, Sparkles, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { AuthForm } from "@/components/AuthForm";

export const Hero = () => {
  const [showAuthForm, setShowAuthForm] = useState(false);

  const handleAuthSuccess = () => {
    setShowAuthForm(false);
    // Redirect to dashboard after successful auth
    window.location.href = '/dashboard';
  };

  const handleBack = () => {
    setShowAuthForm(false);
  };

  if (showAuthForm) {
    return <AuthForm onSuccess={handleAuthSuccess} onBack={handleBack} />;
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0" style={{ background: 'var(--gradient-mesh)' }} />
      
      {/* Animated Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000,transparent)]" />
      
      {/* Floating Elements */}
      <div className="absolute top-40 left-[10%] w-72 h-72 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-40 right-[10%] w-96 h-96 bg-accent/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-60 right-[20%] w-64 h-64 bg-[hsl(var(--primary-glow)/0.15)] rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '0.5s' }} />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-primary/20 mb-8 backdrop-blur-xl shadow-[0_0_20px_hsl(var(--primary)/0.1)] animate-fade-in">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium font-display">Trusted by 10K+ Creators</span>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-display font-bold mb-6 leading-[0.9] animate-fade-in-up">
              <span className="block text-foreground">Protect.</span>
              <span className="block bg-gradient-to-r from-primary via-[hsl(var(--primary-glow))] to-accent bg-clip-text text-transparent">
                Deliver.
              </span>
              <span className="block text-foreground">Get Paid.</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 animate-fade-in-up delay-200 font-light leading-relaxed">
              The smartest way to deliver digital work. Watermarked previews, instant UPI payouts, and zero piracy risk. Built for creators who value their craft.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center mb-12 animate-fade-in-up delay-300">
              <Button 
                variant="hero" 
                size="lg" 
                className="group relative overflow-hidden"
                onClick={() => setShowAuthForm(true)}
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start Delivering Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
              <Button variant="outline" size="lg" className="group border-2 hover:border-primary/50 backdrop-blur-xl">
                <Play className="w-4 h-4 mr-2" />
                Watch Demo
              </Button>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-6 justify-center lg:justify-start items-center text-sm text-muted-foreground animate-fade-in-up delay-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>95% Payment Success</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>60s Avg Payout</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>AES-256 Encrypted</span>
              </div>
            </div>
          </div>
          
          {/* Right Visual */}
          <div className="flex-1 relative animate-fade-in-up delay-300">
            {/* Bento Grid Cards */}
            <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
              {/* Card 1 - Large */}
              <div className="col-span-2 bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-[0_8px_30px_hsl(var(--primary)/0.12)] hover:shadow-[0_8px_40px_hsl(var(--primary)/0.2)] transition-all duration-500 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-semibold">
                    ACTIVE
                  </div>
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">Watermark Preview</h3>
                <p className="text-sm text-muted-foreground mb-4">Secure preview generation in 2.3s</p>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-gradient-to-r from-primary to-accent animate-pulse" />
                </div>
              </div>
              
              {/* Card 2 - Small */}
              <div className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-[0_8px_30px_hsl(var(--accent)/0.12)] hover:shadow-[0_8px_40px_hsl(var(--accent)/0.2)] transition-all duration-500 group">
                <Zap className="w-10 h-10 text-accent mb-3 group-hover:scale-110 transition-transform" />
                <div className="font-display font-bold text-2xl mb-1">60s</div>
                <div className="text-xs text-muted-foreground">Instant Payout</div>
              </div>
              
              {/* Card 3 - Small */}
              <div className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-[0_8px_30px_hsl(var(--primary)/0.12)] hover:shadow-[0_8px_40px_hsl(var(--primary)/0.2)] transition-all duration-500 group">
                <Shield className="w-10 h-10 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <div className="font-display font-bold text-2xl mb-1">100%</div>
                <div className="text-xs text-muted-foreground">Secure Files</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
