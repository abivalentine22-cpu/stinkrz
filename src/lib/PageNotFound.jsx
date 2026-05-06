import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function PageNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="text-center space-y-6">
        <p className="text-6xl select-none">👃</p>
        <h1 className="font-heading text-6xl font-bold text-muted-foreground/30">404</h1>
        <h2 className="font-heading text-xl font-semibold">Something smells off...</h2>
        <p className="font-body text-muted-foreground max-w-sm">
          This page doesn't exist. Maybe it showered too hard and disappeared.
        </p>
        <Link to="/">
          <Button className="gap-2 font-body font-semibold rounded-full">
            <Home className="w-4 h-4" />
            Back to the Block
          </Button>
        </Link>
      </div>
    </div>
  );
}