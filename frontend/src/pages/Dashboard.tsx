import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileVideo, Image, FileText, Folder, TrendingUp, DollarSign, Eye, LogOut, Share2, Copy } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import apiService from "@/services/api";
import EmbeddedPreview from "@/components/EmbeddedPreview";

export default function Dashboard() {
  const [isUploading, setIsUploading] = useState(false);
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    price: 0,
    description: '',
    isPublic: false
  });
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // Fetch user's files
  const fetchUserFiles = async () => {
    if (!isAuthenticated) return;
    
    setIsLoadingFiles(true);
    try {
      const response = await apiService.getUserFiles();
      if (response.success) {
        // The API returns {files: Array} so we need to access response.data.files
        const files = response.data?.files || response.data || [];
        setUserFiles(Array.isArray(files) ? files : []);
        console.log('User files loaded:', files);
      } else {
        console.error('Failed to fetch user files:', response.message);
        setUserFiles([]);
      }
    } catch (error) {
      console.error('Error fetching user files:', error);
      setUserFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Load files when component mounts or user changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserFiles();
    }
  }, [isAuthenticated]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to upload files",
        variant: "destructive",
      });
      return;
    }

    const file = files[0];
    setSelectedFile(file);
    setUploadForm({
      name: file.name,
      price: 0,
      description: '',
      isPublic: false
    });
    setShowUploadForm(true);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setShowUploadForm(false);

    try {
      const metadata = {
        name: uploadForm.name || selectedFile.name,
        price: uploadForm.price,
        description: uploadForm.description || `Uploaded file: ${selectedFile.name}`,
        isPublic: uploadForm.isPublic
      };

      console.log('Starting file upload with metadata:', metadata);
      const response = await apiService.uploadFile(selectedFile, metadata);
      console.log('Upload response received:', response);
      
      if (response.success) {
        console.log('Upload successful, showing toast');
        toast({
          title: "Upload Successful",
          description: "Your file has been uploaded successfully!",
        });
        // Refresh the file list to show the new file
        fetchUserFiles();
      } else {
        console.log('Upload failed:', response.message);
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Something went wrong during upload",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    toast({
      title: "Signed out",
      description: "You've been signed out successfully.",
    });
  };

  const handlePreviewFile = (file: any) => {
    setPreviewFile(file);
    setShowPreview(true);
  };

  const handleShareFile = async (file: any) => {
    try {
      const response = await apiService.generateShareablePreview(file._id);
      if (response.success && response.data?.shareableLink) {
        // Copy to clipboard
        await navigator.clipboard.writeText(response.data.shareableLink);
        toast({
          title: "Shareable Link Generated",
          description: "Preview link copied to clipboard! You can now share this with your client.",
        });
      } else {
        throw new Error(response.message || 'Failed to generate shareable link');
      }
    } catch (error) {
      console.error('Error generating shareable link:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate shareable link",
        variant: "destructive",
      });
    }
  };

  const handleManageFile = (file: any) => {
    console.log('Managing file:', file);
    // Show file details in a more detailed toast
    toast({
      title: "File Management",
      description: `Managing ${file.originalName} (${file.fileType})`,
      duration: 3000,
    });
    
    // You can expand this to show a modal or navigate to a file management page
    // For now, we'll just show the file details
    console.log('File details:', {
      id: file._id,
      name: file.originalName,
      type: file.fileType,
      size: file.size,
      status: file.status,
      price: file.price,
      downloadUrl: file.downloadUrl,
      previewUrl: file.previewUrl
    });
  };

  const stats = [
    { icon: Upload, label: "Total Uploads", value: "24", color: "text-primary" },
    { icon: Eye, label: "Total Views", value: "1,247", color: "text-accent" },
    { icon: DollarSign, label: "Revenue", value: "₹45,890", color: "text-green-500" },
    { icon: TrendingUp, label: "This Month", value: "+32%", color: "text-primary" },
  ];

  // Helper function to get file type icon
  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case "video": return FileVideo;
      case "image": return Image;
      case "3d": return Folder;
      case "document": return FileText;
      case "audio": return FileText;
      default: return FileText;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-40 shadow-[0_4px_20px_hsl(var(--primary)/0.05)]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold mb-1">Dashboard</h1>
            <p className="text-sm text-muted-foreground font-light">Welcome back, {user?.name || 'User'}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="hero" className="font-display" onClick={handleUploadClick} disabled={isUploading}>
              <Upload className="w-4 h-4" />
              {isUploading ? "Uploading..." : "Upload New File"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border-border/50 hover:border-primary/30 hover:shadow-[0_8px_30px_hsl(var(--primary)/0.1)] transition-all duration-500 group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <span className="text-3xl font-display font-bold">{stat.value}</span>
              </div>
              <p className="text-sm text-muted-foreground font-light">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Upload Section */}
        <Card className="p-10 mb-8 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border-dashed border-2 border-primary/30 hover:border-primary/50 transition-all cursor-pointer group relative overflow-hidden rounded-3xl" onClick={handleUploadClick}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.1),transparent_70%)] group-hover:bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.15),transparent_70%)] transition-all" />
          <div className="text-center relative z-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg">
              <Upload className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-display font-semibold mb-3">Upload Your Digital Assets</h3>
            <p className="text-muted-foreground mb-6 font-light max-w-md mx-auto">
              Drag and drop or click to upload videos, images, 3D files, documents
            </p>
            <Button variant="hero" className="font-display" disabled={isUploading}>
              {isUploading ? "Uploading..." : "Choose Files"}
            </Button>
          </div>
        </Card>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          accept="*/*"
        />

        {/* Upload Form Modal */}
        {showUploadForm && selectedFile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Upload File Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">File Name</label>
                  <input
                    type="text"
                    value={uploadForm.name}
                    onChange={(e) => setUploadForm({...uploadForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter file name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={uploadForm.price}
                    onChange={(e) => setUploadForm({...uploadForm, price: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Describe your file..."
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={uploadForm.isPublic}
                    onChange={(e) => setUploadForm({...uploadForm, isPublic: e.target.checked})}
                    className="rounded"
                  />
                  <label htmlFor="isPublic" className="text-sm">Make this file public</label>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUploadForm(false);
                    setSelectedFile(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUploadSubmit}
                  disabled={isUploading}
                  className="flex-1"
                >
                  {isUploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Recent Files */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold">Recent Files</h2>
            <Button variant="ghost" size="sm" className="font-display">View All</Button>
          </div>
          
          <div className="space-y-4">
            {isLoadingFiles ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading your files...</p>
              </div>
            ) : userFiles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No files uploaded yet. Upload your first file to get started!</p>
              </div>
            ) : (
              userFiles.map((file, index) => {
                const FileIcon = getFileTypeIcon(file.fileType);
                return (
                  <Card key={file._id || index} className="p-5 bg-gradient-to-br from-card/70 to-card/30 backdrop-blur-xl border-border/50 hover:border-primary/30 hover:shadow-[0_8px_30px_hsl(var(--primary)/0.1)] transition-all duration-500 group rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <FileIcon className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h4 className="font-display font-semibold mb-1">{file.originalName}</h4>
                          <p className="text-sm text-muted-foreground font-light">
                            {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'} • 
                            {file.price ? ` ₹${file.price}` : ' Free'}
                          </p>
                          <div className="flex gap-2 mt-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handlePreviewFile(file)}
                              className="text-xs h-6 px-2"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Preview
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleShareFile(file)}
                              className="text-xs h-6 px-2"
                            >
                              <Share2 className="h-3 w-3 mr-1" />
                              Share
                            </Button>
                            {(file.downloadUrl || file.s3Url) && (
                              <a 
                                href={file.downloadUrl || file.s3Url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                Download
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-4 py-1.5 rounded-full text-xs font-display font-semibold ${
                          file.status === "ready" 
                            ? "bg-green-500/10 text-green-600 border border-green-500/20" 
                            : file.status === "processing"
                            ? "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
                            : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                        }`}>
                          {file.status}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="font-display"
                          onClick={() => handleManageFile(file)}
                        >
                          Manage
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Embedded Preview Dialog */}
      <EmbeddedPreview 
        file={previewFile}
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          setPreviewFile(null);
        }}
      />
    </div>
  );
}
