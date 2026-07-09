import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border/60 bg-background/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground md:flex-row">
        <p className="flex items-center gap-1.5">
          Feito com <Heart className="h-4 w-4 fill-primary text-primary" /> por
          <span className="font-semibold text-foreground">Salgados da Paty</span>
        </p>
        <div className="flex gap-4">
          <Link to="/missao" className="hover:text-primary">Nossa Missão</Link>
          <Link to="/admin" className="hover:text-primary">Admin</Link>
        </div>
      </div>
    </footer>
  );
}
