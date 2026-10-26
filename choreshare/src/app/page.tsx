import { Heart } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <div className="flex items-center gap-2">
        <Heart className="h-8 w-8 text-primary" fill="currentColor" />
        <h1 className="text-3xl font-bold tracking-tight">ChoreShare</h1>
      </div>
      <p className="text-muted-foreground">情侣家务分配与记录</p>
    </div>
  );
}
