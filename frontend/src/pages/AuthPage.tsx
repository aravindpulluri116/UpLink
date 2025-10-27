import { AuthForm } from "@/components/AuthForm";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const navigate = useNavigate();

  const handleAuthSuccess = () => {
    // Redirect to dashboard after successful authentication
    navigate("/dashboard");
  };

  return <AuthForm onSuccess={handleAuthSuccess} />;
}
