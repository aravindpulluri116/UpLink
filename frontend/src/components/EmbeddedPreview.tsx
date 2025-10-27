import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Lock, Download, Eye, CreditCard, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import apiService from "@/services/api";

interface EmbeddedPreviewProps {
  file: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function EmbeddedPreview({ file, isOpen, onClose }: EmbeddedPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const { toast } = useToast();

  // Fetch embedded preview URL when dialog opens
  useEffect(() => {
    if (isOpen && file) {
      fetchEmbeddedPreview();
    }
  }, [isOpen, file]);

  const fetchEmbeddedPreview = async () => {
    if (!file?._id) return;
    
    setIsLoading(true);
    try {
      const response = await apiService.getEmbeddedPreview(file._id);
      if (response.success && response.data?.previewUrl) {
        setPreviewUrl(response.data.previewUrl);
      } else {
        toast({
          title: "Preview Unavailable",
          description: "No preview available for this file",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching embedded preview:', error);
      toast({
        title: "Error",
        description: "Failed to load preview",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!file?._id) return;
    
    setIsLoading(true);
    try {
      // Create Cashfree payment order
      const response = await apiService.createPaymentOrder(file._id);
      
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
              description: "Your payment has been processed. You can now download the file.",
            });
            onClose(); // Close preview dialog
            window.location.reload(); // Refresh to update access
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
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading preview...</p>
          </div>
        </div>
      );
    }

    if (!previewUrl) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Preview not available</p>
          </div>
        </div>
      );
    }

    // Render based on file type
    switch (file.fileType) {
      case 'image':
        return (
          <div className="relative">
            <img 
              src={previewUrl} 
              alt={file.originalName}
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
                Preview Only
              </Badge>
            </div>
          </div>
        );
      
      case 'video':
        return (
          <div className="relative">
            <video 
              src={previewUrl}
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
                Preview Only
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5" />
              <span>{file?.originalName}</span>
              <Badge variant="outline">{file?.fileType}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview Area */}
          <Card className="p-4">
            {renderPreview()}
          </Card>

          {/* File Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Size:</span> {file?.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}
            </div>
            <div>
              <span className="font-medium">Type:</span> {file?.fileType}
            </div>
            <div>
              <span className="font-medium">Price:</span> {file?.price ? `₹${file.price}` : 'Free'}
            </div>
            <div>
              <span className="font-medium">Status:</span> 
              <Badge variant="outline" className="ml-2">
                {file?.status || 'Unknown'}
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            {file?.price > 0 ? (
              <Button onClick={handlePayment} className="flex-1">
                <CreditCard className="h-4 w-4 mr-2" />
                Pay ₹{file.price} to Download
              </Button>
            ) : (
              <Button variant="outline" className="flex-1" disabled>
                <Download className="h-4 w-4 mr-2" />
                Download (Free)
              </Button>
            )}
            
            <Button variant="outline" onClick={onClose}>
              Close Preview
            </Button>
          </div>

          {/* Security Notice */}
          <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span>This is a watermarked preview. Full access requires payment.</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
