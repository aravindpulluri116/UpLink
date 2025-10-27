import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Download, CreditCard, ArrowLeft, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import apiService from "@/services/api";
import { useNavigate } from "react-router-dom";

export default function PublicPreview() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [previewData, setPreviewData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id && token) {
      fetchPreviewData();
    } else {
      setError('Invalid preview link');
      setIsLoading(false);
    }
  }, [id, token]);

  const fetchPreviewData = async () => {
    if (!id || !token) return;
    
    setIsLoading(true);
    try {
      const response = await apiService.getPublicPreview(id, token);
      if (response.success && response.data) {
        setPreviewData(response.data);
      } else {
        setError(response.message || 'Failed to load preview');
      }
    } catch (error) {
      console.error('Error fetching preview data:', error);
      setError('Failed to load preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!previewData?.fileInfo?.id) {
      toast({
        title: "Error",
        description: "Unable to initiate payment. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Redirect to auth page if not logged in
    const authToken = localStorage.getItem('auth_token');
    if (!authToken) {
      toast({
        title: "Login Required",
        description: "Please login or register to purchase this file.",
      });
      navigate(`/auth?redirect=/preview/${id}?token=${token}`);
      return;
    }
    
    setIsLoading(true);
    try {
      // Create Cashfree payment order
      const response = await apiService.createPaymentOrder(previewData.fileInfo.id);
      
      if (response.success && response.data) {
        const { paymentSessionId, orderId } = response.data;
        
        // Load Cashfree checkout
        const cashfree = (window as any).Cashfree({
          mode: 'sandbox' // Change to 'production' for live
        });
        
        // Open Cashfree payment modal
        cashfree.checkout({
          paymentSessionId,
          returnUrl: `${window.location.origin}/payment/callback?orderId=${orderId}`,
          onSuccess: (data: any) => {
            toast({
              title: "Payment Successful!",
              description: "Your payment has been processed. Redirecting to download...",
            });
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
          },
          onFailure: (data: any) => {
            toast({
              title: "Payment Failed",
              description: data.message || "Payment could not be completed. Please try again.",
              variant: "destructive",
            });
          }
        });
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderPreview = () => {
    if (!previewData?.previewUrl) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Preview not available</p>
          </div>
        </div>
      );
    }

    const fileInfo = previewData.fileInfo;
    
    // Render based on file type
    switch (fileInfo.type) {
      case 'image':
        return (
          <div className="relative">
            <img 
              src={previewData.previewUrl} 
              alt={fileInfo.name}
              className="w-full h-auto max-h-96 object-contain rounded-lg"
              onContextMenu={(e) => e.preventDefault()} // Disable right-click
              onDragStart={(e) => e.preventDefault()} // Disable drag
            />
            {/* Clean Diagonal Watermark Overlay */}
            <div 
              className="absolute inset-0 pointer-events-none select-none"
              style={{
                background: `
                  repeating-linear-gradient(
                    45deg,
                    transparent 0px,
                    transparent 100px,
                    rgba(0, 0, 0, 0.08) 100px,
                    rgba(0, 0, 0, 0.08) 120px
                  )
                `,
                backgroundSize: '200px 200px'
              }}
            >
              <div 
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  background: `
                    repeating-linear-gradient(
                      45deg,
                      transparent 0px,
                      transparent 150px,
                      rgba(255, 255, 255, 0.1) 150px,
                      rgba(255, 255, 255, 0.1) 180px
                    )
                  `,
                  backgroundSize: '300px 300px'
                }}
              >
                <div 
                  className="text-4xl font-bold text-white/15 select-none"
                  style={{
                    transform: 'rotate(-45deg)',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                    letterSpacing: '0.2em',
                    fontSize: 'clamp(2rem, 6vw, 4rem)',
                    lineHeight: '1.1'
                  }}
                >
                  SOLIDARC
                </div>
              </div>
            </div>
            <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <Badge variant="secondary" className="bg-black/50 text-white">
                <Lock className="h-3 w-3 mr-1" />
                Watermarked Preview
              </Badge>
            </div>
          </div>
        );
      
      case 'video':
        return (
          <div className="relative">
            <video 
              src={previewData.previewUrl}
              controls
              className="w-full h-auto max-h-96 rounded-lg"
              controlsList="nodownload nofullscreen noremoteplayback"
              onContextMenu={(e) => e.preventDefault()}
            />
            {/* Clean Diagonal Watermark Overlay */}
            <div 
              className="absolute inset-0 pointer-events-none select-none"
              style={{
                background: `
                  repeating-linear-gradient(
                    45deg,
                    transparent 0px,
                    transparent 100px,
                    rgba(0, 0, 0, 0.08) 100px,
                    rgba(0, 0, 0, 0.08) 120px
                  )
                `,
                backgroundSize: '200px 200px'
              }}
            >
              <div 
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  background: `
                    repeating-linear-gradient(
                      45deg,
                      transparent 0px,
                      transparent 150px,
                      rgba(255, 255, 255, 0.1) 150px,
                      rgba(255, 255, 255, 0.1) 180px
                    )
                  `,
                  backgroundSize: '300px 300px'
                }}
              >
                <div 
                  className="text-4xl font-bold text-white/15 select-none"
                  style={{
                    transform: 'rotate(-45deg)',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                    letterSpacing: '0.2em',
                    fontSize: 'clamp(2rem, 6vw, 4rem)',
                    lineHeight: '1.1'
                  }}
                >
                  SOLIDARC
                </div>
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="bg-black/50 text-white">
                <Lock className="h-3 w-3 mr-1" />
                Watermarked Preview
              </Badge>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
            <div className="text-center">
              <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Preview not supported for this file type</p>
            </div>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Preview Not Available</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!previewData) {
    return null;
  }

  const fileInfo = previewData.fileInfo;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{fileInfo.name}</h1>
              <p className="text-sm text-muted-foreground">Preview Only</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Lock className="h-3 w-3 mr-1" />
            Watermarked
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Preview Area */}
          <Card className="p-6">
            {renderPreview()}
          </Card>

          {/* File Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">File Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Name:</span> {fileInfo.name}
              </div>
              <div>
                <span className="font-medium">Type:</span> {fileInfo.type}
              </div>
              <div>
                <span className="font-medium">Size:</span> {fileInfo.size ? `${(fileInfo.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}
              </div>
              <div>
                <span className="font-medium">Price:</span> {fileInfo.price ? `₹${fileInfo.price}` : 'Free'}
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <Card className="p-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>This is a watermarked preview. Full access requires payment.</span>
              </div>
              
              {fileInfo.price > 0 ? (
                <Button onClick={handlePayment} size="lg" className="w-full max-w-sm">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay ₹{fileInfo.price} for Full Access
                </Button>
              ) : (
                <Button variant="outline" size="lg" className="w-full max-w-sm" disabled>
                  <Download className="h-4 w-4 mr-2" />
                  Download (Free)
                </Button>
              )}
              
              <p className="text-xs text-muted-foreground">
                Contact the creator for payment and full access to this file.
              </p>
            </div>
          </Card>

          {/* Security Notice */}
          <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span>This preview is watermarked and cannot be downloaded. Full access requires payment to the creator.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
