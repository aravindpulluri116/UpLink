import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import apiService from "@/services/api";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  
  useEffect(() => {
    verifyPayment();
  }, []);
  
  const verifyPayment = async () => {
    const orderId = searchParams.get('orderId');
    
    if (!orderId) {
      setStatus('failed');
      toast({
        title: "Verification Failed",
        description: "Invalid payment reference",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Verify payment status from backend
      const response = await apiService.verifyPaymentStatus(orderId);
      
      if (response.success && response.data) {
        setPaymentDetails(response.data);
        
        if (response.data.status === 'completed') {
          setStatus('success');
          toast({
            title: "Payment Successful!",
            description: "Your payment has been verified. You can now access the file.",
          });
        } else if (response.data.status === 'failed') {
          setStatus('failed');
          toast({
            title: "Payment Failed",
            description: "Your payment could not be completed.",
            variant: "destructive",
          });
        } else {
          // Still pending, wait a bit and check again
          setTimeout(verifyPayment, 2000);
        }
      } else {
        setStatus('failed');
        toast({
          title: "Verification Failed",
          description: "Could not verify payment status",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      setStatus('failed');
      toast({
        title: "Error",
        description: error.message || "Failed to verify payment",
        variant: "destructive",
      });
    }
  };
  
  const handleDownload = async () => {
    if (!paymentDetails?.fileId) return;
    
    try {
      const response = await apiService.getDownloadUrl(paymentDetails.fileId);
      if (response.success && response.data?.downloadUrl) {
        window.open(response.data.downloadUrl, '_blank');
        toast({
          title: "Download Started",
          description: "Your file download has started",
        });
      }
    } catch (error: any) {
      toast({
        title: "Download Error",
        description: error.message || "Failed to generate download link",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="max-w-md w-full p-8">
        {status === 'verifying' && (
          <div className="text-center">
            <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold mb-2">Verifying Payment</h2>
            <p className="text-muted-foreground">Please wait while we confirm your payment...</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-green-700">Payment Successful!</h2>
            <p className="text-muted-foreground mb-6">
              Your payment of ₹{paymentDetails?.amount} has been confirmed.
            </p>
            
            <div className="space-y-3">
              <Button onClick={handleDownload} className="w-full">
                Download File
              </Button>
              <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
                Go to Dashboard
              </Button>
            </div>
            
            <div className="mt-6 p-4 bg-muted rounded-lg text-sm text-left">
              <p className="font-medium mb-2">Payment Details:</p>
              <div className="space-y-1 text-muted-foreground">
                <p>Payment ID: {paymentDetails?.paymentId || 'N/A'}</p>
                <p>Amount: ₹{paymentDetails?.amount || 'N/A'}</p>
                <p>Status: {paymentDetails?.status || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}
        
        {status === 'failed' && (
          <div className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-red-700">Payment Failed</h2>
            <p className="text-muted-foreground mb-6">
              Your payment could not be completed. Please try again.
            </p>
            
            <div className="space-y-3">
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Back to Dashboard
              </Button>
              <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
                Try Again
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

