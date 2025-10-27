import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const Pricing = () => {
  const plans = [
    {
      name: "Starter",
      commission: "5%",
      description: "Perfect for getting started",
      buttonText: "Get Started",
      buttonVariant: "outline" as const,
      popular: false,
      features: [
        "Up to 50 deliveries/month",
        "Basic watermarking",
        "Email support",
        "UPI payouts",
        "2GB storage"
      ]
    },
    {
      name: "Professional",
      commission: "3%",
      description: "For serious freelancers",
      buttonText: "Get Started",
      buttonVariant: "hero" as const,
      popular: true,
      features: [
        "Unlimited deliveries",
        "Advanced watermarking",
        "Priority support",
        "Instant UPI payouts",
        "50GB storage",
        "Custom branding",
        "Analytics dashboard"
      ]
    },
    {
      name: "Enterprise",
      commission: "Custom",
      description: "For agencies & teams",
      buttonText: "Contact Sales",
      buttonVariant: "outline" as const,
      popular: false,
      features: [
        "Everything in Professional",
        "White-label solution",
        "Dedicated account manager",
        "API access",
        "Unlimited storage",
        "Custom integrations"
      ]
    }
  ];

  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/50 to-background pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-5xl md:text-6xl font-display font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your needs. All plans include secure delivery and instant payments.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 animate-fade-in-up">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 backdrop-blur-sm transition-all duration-500 hover:scale-[1.02] ${
                plan.popular
                  ? "bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 border-2 border-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.15)]"
                  : "bg-card/50 border border-border/50 hover:border-primary/20"
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-gradient-to-r from-primary via-accent to-primary text-white text-sm font-semibold px-6 py-2 rounded-full shadow-lg">
                    Most Popular
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-8">
                <h3 className="text-2xl font-display font-bold text-foreground mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-5xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {plan.commission}
                  </span>
                  {plan.commission !== "Custom" && (
                    <span className="text-muted-foreground">commission</span>
                  )}
                </div>
                <p className="text-muted-foreground">{plan.description}</p>
              </div>

              {/* CTA Button */}
              <Button
                variant={plan.buttonVariant}
                size="lg"
                className="w-full mb-8"
              >
                {plan.buttonText}
              </Button>

              {/* Features List */}
              <div className="space-y-4">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-primary/10 p-1">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-foreground/80 text-sm leading-relaxed">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* Decorative Elements */}
              {plan.popular && (
                <>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl -z-10" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-accent/20 to-transparent rounded-full blur-2xl -z-10" />
                </>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            All plans include secure file delivery, watermarking, and instant UPI payments.{" "}
            <a href="#" className="text-primary hover:underline font-medium">
              Compare plans →
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
